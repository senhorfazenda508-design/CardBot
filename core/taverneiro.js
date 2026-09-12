const { EmbedBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { falarComTaverneiro, descontoAtivo, tierCliente } = require('../game/ai');
const { EMOJI_HUMOR } = require('../game/npcEngine');

// alvoUser (opcional): { id, username } de outro jogador mencionado na
// mensagem — permite pedir pro Thomas comentar sobre outro cliente da
// taverna, criando uma interação real entre jogadores mediada pelo NPC.
async function taverneiroCore(ctx, mensagem, alvoUser) {
  if (!mensagem || !mensagem.trim()) {
    await ctx.send({
      content: 'Fale alguma coisa com o Thomas! Ex: `;taverneiro e aí, como vai o negócio?` (ou mencione alguém: `;taverneiro @pessoa o que acha dela?`)',
    });
    return;
  }

  const player = getPlayer(ctx.userId, ctx.username);

  let contextoAlvo = null;
  if (alvoUser && alvoUser.id !== ctx.userId && !alvoUser.bot) {
    const outroPlayer = getPlayer(alvoUser.id, alvoUser.username);
    contextoAlvo = {
      username: outroPlayer.username,
      tier: tierCliente(outroPlayer.taverneiro),
      visitas: outroPlayer.taverneiro?.visitas || 0,
    };
  }

  const resultado = await falarComTaverneiro(player, mensagem.trim(), contextoAlvo, ctx.guildId);
  savePlayer(ctx.userId, player);

  const humorEmoji = resultado.emocao ? (EMOJI_HUMOR[resultado.emocao] || '') : '';
  const corPorEstado = resultado.deMal ? 0x2f3136 : resultado.expulso ? 0xff3860 : resultado.ok ? 0xd9a441 : 0x808080;

  const embed = new EmbedBuilder()
    .setColor(corPorEstado)
    .setAuthor({ name: `${humorEmoji ? humorEmoji + ' ' : ''}Thomas, o Taverneiro` })
    .setDescription(`💬 "${resultado.resposta}"`);

  const extras = [];
  if (resultado.moedasGanhas > 0) extras.push(`💰 +${resultado.moedasGanhas} moedas de gorjeta!`);
  if (resultado.descontoGanho > 0) extras.push(`🏷️ Desconto de ${resultado.descontoGanho}% liberado na \`/loja\` (vale por 10 min ou até a próxima compra)`);
  if (resultado.expulso) extras.push('🚪 Thomas te expulsou da taverna! (só na fala — pode tentar falar com ele de novo já já)');
  if (resultado.deMal) extras.push(`💢 Thomas ficou de mal com você de verdade e não vai querer papo por um tempo.`);
  if (extras.length) embed.addFields({ name: '\u200b', value: extras.join('\n') });

  const desc = descontoAtivo(player);
  const tier = tierCliente(player.taverneiro);
  embed.setFooter({ text: `Saldo: ${player.moedas} moedas · Você é ${tier} da taverna${desc > 0 ? ` · Desconto ativo: ${desc}%` : ''}` });

  await ctx.send({ embeds: [embed] });
}

module.exports = taverneiroCore;
