const { EmbedBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { buscarCartasPorNome, RARIDADE_COR } = require('../game/cards');
const { PRECO_VENDA } = require('../game/economy');

async function venderCore(ctx, termo, quantidadeDesejada) {
  if (!termo || !termo.trim()) {
    await ctx.send({ content: 'Me diga qual carta vender. Ex: `;vender espada` ou `;vender espada 2`' });
    return;
  }

  const player = getPlayer(ctx.userId, ctx.username);
  const candidatas = buscarCartasPorNome(termo).filter(c => player.colecao.includes(c.id));

  if (candidatas.length === 0) {
    await ctx.send({ content: `Você não tem nenhuma carta chamada "${termo}" pra vender.` });
    return;
  }

  if (candidatas.length > 1) {
    const lista = candidatas.slice(0, 10).map(c => `${c.emoji} **${c.nome}**`).join('\n');
    await ctx.send({ content: `Encontrei mais de uma carta sua com esse termo, seja mais específico:\n${lista}` });
    return;
  }

  const carta = candidatas[0];
  const possuidas = player.colecao.filter(id => id === carta.id).length;
  const qtd = Math.max(1, Math.min(quantidadeDesejada || 1, possuidas));

  let removidas = 0;
  player.colecao = player.colecao.filter(id => {
    if (id === carta.id && removidas < qtd) {
      removidas++;
      return false;
    }
    return true;
  });

  const precoUnitario = PRECO_VENDA[carta.raridade];
  const total = precoUnitario * removidas;
  player.moedas += total;
  savePlayer(ctx.userId, player);

  const embed = new EmbedBuilder()
    .setColor(RARIDADE_COR[carta.raridade])
    .setTitle('💸 Venda concluída')
    .setDescription(`Você vendeu ${carta.emoji} **${carta.nome}** x${removidas} por **${total}** moedas (${precoUnitario} cada).`)
    .setFooter({ text: `Saldo total: ${player.moedas} moedas` });

  await ctx.send({ embeds: [embed] });
}

module.exports = venderCore;
