const { EmbedBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');

async function recolherCore(ctx) {
  const player = getPlayer(ctx.userId, ctx.username);

  if (!player.run.ativa) {
    await ctx.send({ content: 'Você não tem nenhuma run ativa no momento. Use `/explorar` ou `;adv` para começar!' });
    return;
  }

  const ganho = player.run.moedasRun;
  player.moedas += ganho;
  const andarFinal = player.run.andar;
  player.run = { ativa: false, andar: 0, hp: 0, hpMax: 0, escudo: 0, moedasRun: 0 };
  savePlayer(ctx.userId, player);

  const embed = new EmbedBuilder()
    .setColor(0x43b581)
    .setTitle('🎒 Run encerrada com segurança')
    .setDescription(`Você recolheu **${ganho}** moedas ao sair da masmorra no andar **${andarFinal}**.`)
    .setFooter({ text: `Saldo total: ${player.moedas} moedas` });

  await ctx.send({ embeds: [embed] });
}

module.exports = recolherCore;
