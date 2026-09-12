const { EmbedBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { npcsConvidaveis, buscarNPC, idsConvidaveis } = require('../game/npcs');
const { estadoPadraoNPC } = require('../game/npcEngine');

function montarListaConvidaveis(player) {
  const linhas = npcsConvidaveis().map(npc => {
    const estado = player.npcs?.[npc.id];
    const status = estado?.convidado ? '✅ já mora na sua vila' : `🪙 ${npc.custoConvite} moedas pra convidar`;
    return `${npc.emoji} **${npc.nome}** (\`${npc.id}\`) — ${status}`;
  });
  return linhas.join('\n');
}

async function convidarCore(ctx, termoNpc) {
  const player = getPlayer(ctx.userId, ctx.username);

  if (!player.cidade?.fundada) {
    await ctx.send({
      content: '🏚️ Você precisa fundar sua cidade primeiro! Use `/cidade` (ou `;cidade`) e construa o Castelo antes de convidar moradores pra viver nela.',
    });
    return;
  }

  if (!termoNpc || !termoNpc.trim()) {
    const embed = new EmbedBuilder()
      .setColor(0xd9a441)
      .setTitle(`🏘️ Convidar moradores para ${player.cidade.nome || 'sua vila'}`)
      .setDescription(
        `Convide moradores pra viverem na sua vila e conversarem com você (e entre si) sempre que quiser.\n\n${montarListaConvidaveis(player)}\n\n` +
        'Use `/convidar npc:<nome>` ou `;convidar <nome>`. Ex: `;convidar helena`'
      );
    await ctx.send({ embeds: [embed] });
    return;
  }

  const npc = buscarNPC(termoNpc);
  if (!npc || !idsConvidaveis().includes(npc.id)) {
    await ctx.send({
      content: `Não encontrei ninguém convidável chamado "${termoNpc}". Veja a lista com \`/convidar\` (sem nome).`,
    });
    return;
  }

  if (!player.npcs) player.npcs = {};
  const estadoAtual = player.npcs[npc.id];
  if (estadoAtual?.convidado) {
    await ctx.send({ content: `${npc.emoji} **${npc.nome}** já mora na sua vila! Fale com ele(a) usando \`/morador npc:${npc.id}\` ou \`;morador ${npc.id} <mensagem>\`.` });
    return;
  }

  if (player.moedas < npc.custoConvite) {
    await ctx.send({
      content: `Você precisa de 🪙 **${npc.custoConvite}** moedas pra convidar ${npc.emoji} **${npc.nome}** (você tem ${player.moedas}).`,
    });
    return;
  }

  player.moedas -= npc.custoConvite;
  player.npcs[npc.id] = { ...estadoPadraoNPC(), convidado: true, convidadoEm: Date.now() };
  savePlayer(ctx.userId, player);

  const embed = new EmbedBuilder()
    .setColor(0x43b581)
    .setAuthor({ name: `${npc.nome} agora mora na sua vila!` })
    .setDescription(`${npc.emoji} "${npc.fraseConvite}"`)
    .setFooter({ text: `Saldo: ${player.moedas} moedas · Fale com ele(a): /morador npc:${npc.id}` });

  await ctx.send({ embeds: [embed] });
}

module.exports = convidarCore;
