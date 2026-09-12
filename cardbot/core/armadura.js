const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { ARMADURAS, RARIDADE_COR_HEX } = require('../game/armor');

function montarEmbed(player) {
  const equipadaId = player.equipamento.armadura;
  const equipada = equipadaId ? ARMADURAS[equipadaId] : null;

  const embed = new EmbedBuilder()
    .setColor(equipada ? RARIDADE_COR_HEX[equipada.raridade] : 0x5865f2)
    .setTitle('🥋 Armaduras')
    .setDescription(
      equipada
        ? `Equipada: ${equipada.emoji} **${equipada.nome}** (${equipada.raridade})\n🛡️ Reduz **${Math.round(equipada.defesa * 100)}%** do dano recebido\n❤️ +**${equipada.vida}** de vida máxima em batalhas e duelos`
        : 'Você não tem nenhuma armadura equipada.\nCompre uma na `/loja` (categoria Armaduras) e equipe aqui.'
    );

  if (player.armaduras.length === 0) {
    embed.addFields({ name: 'Seu baú de armaduras', value: 'Vazio — vá até a `/loja` e compre sua primeira armadura!' });
  } else {
    const linhas = player.armaduras.map(id => {
      const a = ARMADURAS[id];
      if (!a) return null;
      const marcador = id === equipadaId ? ' ✅ *(equipada)*' : '';
      return `${a.emoji} **${a.nome}** — 🛡️ ${Math.round(a.defesa * 100)}% · ❤️ +${a.vida}${marcador}`;
    }).filter(Boolean);
    embed.addFields({ name: 'Seu baú de armaduras', value: linhas.join('\n') });
  }

  return embed;
}

function montarSelect(player) {
  if (player.armaduras.length === 0) return [];
  const menu = new StringSelectMenuBuilder()
    .setCustomId('equipar_armadura')
    .setPlaceholder('Escolha uma armadura para equipar')
    .addOptions(
      player.armaduras.map(id => {
        const a = ARMADURAS[id];
        return {
          label: `${a.nome} (${a.raridade})`,
          description: `Defesa +${Math.round(a.defesa * 100)}% · Vida +${a.vida}`,
          value: id,
          emoji: a.emoji,
          default: id === player.equipamento.armadura,
        };
      })
    );
  return [new ActionRowBuilder().addComponents(menu)];
}

async function armaduraCore(ctx) {
  let player = getPlayer(ctx.userId, ctx.username);
  const msg = await ctx.send({ embeds: [montarEmbed(player)], components: montarSelect(player) });

  if (player.armaduras.length === 0) return;

  const collector = msg.createMessageComponentCollector({ time: 60_000 });

  collector.on('collect', async i => {
    if (i.user.id !== ctx.userId) {
      await i.reply({ content: 'Esse menu não é seu! Use `/armadura` para abrir o seu.', ephemeral: true });
      return;
    }
    const escolhida = i.values[0];
    player = getPlayer(ctx.userId, ctx.username);
    player.equipamento.armadura = escolhida;
    savePlayer(ctx.userId, player);
    await i.update({ embeds: [montarEmbed(player)], components: montarSelect(player) });
  });

  collector.on('end', async () => {
    try { await msg.edit({ components: [] }); } catch { /* mensagem pode já ter sido apagada */ }
  });
}

module.exports = armaduraCore;
