const { getPlayer } = require('../db');

async function saldoCore(ctx) {
  const player = getPlayer(ctx.userId, ctx.username);
  await ctx.send({ content: `💰 Você tem **${player.moedas}** moedas.` });
}

module.exports = saldoCore;
