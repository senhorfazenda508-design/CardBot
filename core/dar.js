const { EmbedBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { buscarCartasPorNome } = require('../game/cards');

async function darCore(ctx, alvoUser, entrada) {
  if (!alvoUser) {
    await ctx.send({ content: 'Mencione quem vai receber o presente. Ex: `;dar @pessoa 100` ou `;dar @pessoa Excalibur`' });
    return;
  }
  if (alvoUser.id === ctx.userId) {
    await ctx.send({ content: 'Você não pode presentear a si mesmo 🙂' });
    return;
  }
  if (alvoUser.bot) {
    await ctx.send({ content: 'Não dá pra presentear um bot!' });
    return;
  }
  if (!entrada || !entrada.trim()) {
    await ctx.send({ content: 'Diga quanto de moedas ou o nome da carta que quer dar. Ex: `;dar @pessoa 100` ou `;dar @pessoa Excalibur`' });
    return;
  }

  const remetente = getPlayer(ctx.userId, ctx.username);
  const destinatario = getPlayer(alvoUser.id, alvoUser.username);

  // --- Presente em moedas ---
  if (/^\d+$/.test(entrada.trim())) {
    const quantidade = parseInt(entrada.trim(), 10);
    if (quantidade <= 0) {
      await ctx.send({ content: 'A quantidade precisa ser maior que zero.' });
      return;
    }
    if (remetente.moedas < quantidade) {
      await ctx.send({ content: `Você não tem moedas suficientes. Seu saldo: ${remetente.moedas}.` });
      return;
    }
    remetente.moedas -= quantidade;
    destinatario.moedas += quantidade;
    savePlayer(ctx.userId, remetente);
    savePlayer(alvoUser.id, destinatario);

    const embed = new EmbedBuilder()
      .setColor(0x43b581)
      .setTitle('🎁 Presente enviado!')
      .setDescription(`Você deu **${quantidade}** moedas para <@${alvoUser.id}>.`)
      .setFooter({ text: `Seu saldo agora: ${remetente.moedas} moedas` });
    await ctx.send({ embeds: [embed] });
    return;
  }

  // --- Presente em carta ---
  const candidatas = buscarCartasPorNome(entrada).filter(c => remetente.colecao.includes(c.id));
  if (candidatas.length === 0) {
    await ctx.send({ content: `Você não tem nenhuma carta chamada "${entrada}" pra dar.` });
    return;
  }
  if (candidatas.length > 1) {
    const lista = candidatas.slice(0, 10).map(c => `${c.emoji} **${c.nome}**`).join('\n');
    await ctx.send({ content: `Encontrei mais de uma carta sua com esse termo, seja mais específico:\n${lista}` });
    return;
  }

  const carta = candidatas[0];
  const idx = remetente.colecao.indexOf(carta.id);
  remetente.colecao.splice(idx, 1);
  destinatario.colecao.push(carta.id);
  savePlayer(ctx.userId, remetente);
  savePlayer(alvoUser.id, destinatario);

  const embed = new EmbedBuilder()
    .setColor(0x43b581)
    .setTitle('🎁 Presente enviado!')
    .setDescription(`Você deu ${carta.emoji} **${carta.nome}** para <@${alvoUser.id}>.`);
  await ctx.send({ embeds: [embed] });
}

module.exports = darCore;
