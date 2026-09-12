const { EmbedBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { buscarNPC, npcsConvidaveis, idsConvidaveis } = require('../game/npcs');
const { interagirComNPC, garantirEstadoNPC, tierCliente, EMOJI_HUMOR } = require('../game/npcEngine');

async function moradorCore(ctx, termoNpc, mensagem, alvoUser) {
  const player = getPlayer(ctx.userId, ctx.username);

  if (!termoNpc || !termoNpc.trim()) {
    const lista = npcsConvidaveis()
      .filter(n => player.npcs?.[n.id]?.convidado)
      .map(n => `${n.emoji} **${n.nome}** (\`${n.id}\`)`)
      .join('\n');
    await ctx.send({
      content: lista
        ? `Com quem você quer falar? Moradores da sua vila:\n${lista}\n\nEx: \`;morador helena e aí, tudo certo?\` ou \`/morador npc:helena mensagem:...\``
        : 'Você ainda não convidou nenhum morador pra sua vila. Use `/convidar` pra ver quem pode vir morar com você!',
    });
    return;
  }

  const npc = buscarNPC(termoNpc);
  if (!npc || !idsConvidaveis().includes(npc.id)) {
    await ctx.send({ content: `Não encontrei nenhum morador convidável chamado "${termoNpc}". Veja a lista com \`/convidar\`.` });
    return;
  }

  const estado = player.npcs?.[npc.id];
  if (!estado?.convidado) {
    await ctx.send({
      content: `${npc.emoji} **${npc.nome}** ainda não mora na sua vila. Convide primeiro com \`/convidar npc:${npc.id}\` (custa 🪙 ${npc.custoConvite} moedas).`,
    });
    return;
  }

  if (!mensagem || !mensagem.trim()) {
    await ctx.send({ content: `Fale alguma coisa com ${npc.nome}! Ex: \`;morador ${npc.id} como vai?\`` });
    return;
  }

  garantirEstadoNPC(estado);

  let contextoAlvo = null;
  if (alvoUser && alvoUser.id !== ctx.userId && !alvoUser.bot) {
    contextoAlvo = { username: alvoUser.username };
  }

  const resultado = await interagirComNPC({ npc, estado, player, mensagemUsuario: mensagem.trim(), contextoAlvo, guildId: ctx.guildId });
  savePlayer(ctx.userId, player);

  const humorEmoji = resultado.emocao ? (EMOJI_HUMOR[resultado.emocao] || '') : '';
  const corPorEstado = resultado.deMal ? 0x2f3136 : resultado.expulso ? 0xff3860 : resultado.ok ? 0xd9a441 : 0x808080;

  const embed = new EmbedBuilder()
    .setColor(corPorEstado)
    .setAuthor({ name: `${humorEmoji ? humorEmoji + ' ' : ''}${npc.emoji} ${npc.nome}` })
    .setDescription(`💬 "${resultado.resposta}"`);

  const extras = [];
  if (resultado.moedasGanhas > 0) extras.push(`💰 +${resultado.moedasGanhas} moedas!`);
  if (resultado.descontoGanho > 0) extras.push(`🏷️ Desconto de ${resultado.descontoGanho}% liberado na \`/loja\` (vale por 10 min ou até a próxima compra)`);
  if (resultado.expulso) extras.push(`🚪 ${npc.nome.split(',')[0]} te expulsou da taverna! (só na fala — pode tentar de novo já já)`);
  if (resultado.deMal) extras.push(`💢 ${npc.nome.split(',')[0]} ficou de mal com você de verdade e não vai querer papo por um tempo.`);
  if (extras.length) embed.addFields({ name: '\u200b', value: extras.join('\n') });

  embed.setFooter({ text: `Saldo: ${player.moedas} moedas · Vínculo: ${tierCliente(estado)}` });

  await ctx.send({ embeds: [embed] });
}

module.exports = moradorCore;
