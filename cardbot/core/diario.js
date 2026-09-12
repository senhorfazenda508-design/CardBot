const { EmbedBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');

const UM_DIA_MS = 24 * 60 * 60 * 1000;
const DOIS_DIAS_MS = 2 * UM_DIA_MS;

async function diarioCore(ctx) {
  const player = getPlayer(ctx.userId, ctx.username);
  const agora = Date.now();
  const desdeUltimo = agora - player.ultimoDiario;

  if (desdeUltimo < UM_DIA_MS) {
    const restante = UM_DIA_MS - desdeUltimo;
    const horas = Math.floor(restante / (60 * 60 * 1000));
    const minutos = Math.floor((restante % (60 * 60 * 1000)) / (60 * 1000));
    await ctx.send({
      content: `⏳ Você já recolheu sua recompensa hoje. Volte em **${horas}h ${minutos}min**.`,
      ephemeral: true,
    });
    return;
  }

  if (desdeUltimo > DOIS_DIAS_MS) player.streakDiario = 0;
  player.streakDiario += 1;
  player.ultimoDiario = agora;

  const base = 100;
  const bonusStreak = Math.min(player.streakDiario * 10, 150);
  const total = base + bonusStreak;
  player.moedas += total;
  savePlayer(ctx.userId, player);

  const embed = new EmbedBuilder()
    .setColor(0x43b581)
    .setTitle('🎁 Recompensa diária')
    .setDescription(`Você recebeu **${total}** moedas!\nSequência atual: 🔥 **${player.streakDiario}** dia(s)`)
    .setFooter({ text: `Saldo total: ${player.moedas} moedas` });

  await ctx.send({ embeds: [embed] });
}

module.exports = diarioCore;
