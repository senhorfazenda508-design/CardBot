const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { PERKS, RARIDADE_COR_HEX, perksPorTipo } = require('../game/perks');

function montarEmbed(player) {
  const passivaId = player.equipamento.perkPassiva;
  const ativaId = player.equipamento.perkAtiva;
  const passiva = passivaId ? PERKS[passivaId] : null;
  const ativa = ativaId ? PERKS[ativaId] : null;

  const embed = new EmbedBuilder()
    .setColor(passiva ? RARIDADE_COR_HEX[passiva.raridade] : (ativa ? RARIDADE_COR_HEX[ativa.raridade] : 0x5865f2))
    .setTitle('✨ Perks')
    .setDescription(
      'Perks são habilidades extras, separadas das cartas e da armadura. Você pode equipar **1 perk passiva** (sempre ativa) e **1 perk ativa** (usável 1x por batalha/duelo, sem gastar o turno).\n\n' +
      `🔵 Passiva equipada: ${passiva ? `${passiva.emoji} **${passiva.nome}** — ${passiva.descricao}` : 'nenhuma'}\n` +
      `🟠 Ativa equipada: ${ativa ? `${ativa.emoji} **${ativa.nome}** — ${ativa.descricao}` : 'nenhuma'}`
    );

  const passivas = player.perks.filter(id => PERKS[id]?.tipo === 'passiva');
  const ativas = player.perks.filter(id => PERKS[id]?.tipo === 'ativa');

  embed.addFields({
    name: '🔵 Suas perks passivas',
    value: passivas.length
      ? passivas.map(id => {
          const p = PERKS[id];
          const marcador = id === passivaId ? ' ✅ *(equipada)*' : '';
          return `${p.emoji} **${p.nome}** — ${p.descricao}${marcador}`;
        }).join('\n')
      : 'Nenhuma ainda — compre na `/loja` (categoria Perks).',
  });

  embed.addFields({
    name: '🟠 Suas perks ativas',
    value: ativas.length
      ? ativas.map(id => {
          const p = PERKS[id];
          const marcador = id === ativaId ? ' ✅ *(equipada)*' : '';
          return `${p.emoji} **${p.nome}** — ${p.descricao}${marcador}`;
        }).join('\n')
      : 'Nenhuma ainda — compre na `/loja` (categoria Perks).',
  });

  return embed;
}

function montarSelects(player) {
  const rows = [];
  const passivas = player.perks.filter(id => PERKS[id]?.tipo === 'passiva');
  const ativas = player.perks.filter(id => PERKS[id]?.tipo === 'ativa');

  if (passivas.length > 0) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('equipar_perk_passiva')
      .setPlaceholder('Escolha uma perk passiva para equipar')
      .addOptions(
        passivas.map(id => {
          const p = PERKS[id];
          return {
            label: `${p.nome} (${p.raridade})`,
            description: p.descricao.slice(0, 95),
            value: id,
            emoji: p.emoji,
            default: id === player.equipamento.perkPassiva,
          };
        })
      );
    rows.push(new ActionRowBuilder().addComponents(menu));
  }

  if (ativas.length > 0) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('equipar_perk_ativa')
      .setPlaceholder('Escolha uma perk ativa para equipar')
      .addOptions(
        ativas.map(id => {
          const p = PERKS[id];
          return {
            label: `${p.nome} (${p.raridade})`,
            description: p.descricao.slice(0, 95),
            value: id,
            emoji: p.emoji,
            default: id === player.equipamento.perkAtiva,
          };
        })
      );
    rows.push(new ActionRowBuilder().addComponents(menu));
  }

  return rows;
}

async function perksCore(ctx) {
  let player = getPlayer(ctx.userId, ctx.username);
  const msg = await ctx.send({ embeds: [montarEmbed(player)], components: montarSelects(player) });

  if (player.perks.length === 0) return;

  const collector = msg.createMessageComponentCollector({ time: 60_000 });

  collector.on('collect', async i => {
    if (i.user.id !== ctx.userId) {
      await i.reply({ content: 'Esse menu não é seu! Use `/perks` para abrir o seu.', ephemeral: true });
      return;
    }
    const escolhida = i.values[0];
    player = getPlayer(ctx.userId, ctx.username);
    if (i.customId === 'equipar_perk_passiva') {
      player.equipamento.perkPassiva = escolhida;
    } else if (i.customId === 'equipar_perk_ativa') {
      player.equipamento.perkAtiva = escolhida;
    }
    savePlayer(ctx.userId, player);
    await i.update({ embeds: [montarEmbed(player)], components: montarSelects(player) });
  });

  collector.on('end', async () => {
    try { await msg.edit({ components: [] }); } catch { /* mensagem pode já ter sido apagada */ }
  });
}

module.exports = perksCore;
