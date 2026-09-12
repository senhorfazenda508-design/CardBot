const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { loadAll } = require('../db');
const { calcularPontuacao } = require('../game/city');

function montarEmbedMoedas(ctx) {
  const todos = loadAll();
  const lista = Object.entries(todos)
    .map(([id, p]) => ({ id, username: p.username, moedas: p.moedas || 0, maiorAndar: p.estatisticas?.maiorAndar || 0 }))
    .sort((a, b) => b.moedas - a.moedas)
    .slice(0, 10);

  if (lista.length === 0) {
    return new EmbedBuilder().setColor(0xffd700).setTitle('🏆 Ranking de Moedas').setDescription('Ainda não há ninguém no ranking. Use `/explorar` pra começar!');
  }

  const medalhas = ['🥇', '🥈', '🥉'];
  const linhas = lista.map((p, i) => {
    const posicao = medalhas[i] || `**${i + 1}.**`;
    const destaque = p.id === ctx.userId ? ' ⬅️ você' : '';
    return `${posicao} **${p.username}** — 💰 ${p.moedas} moedas · 📈 andar ${p.maiorAndar}${destaque}`;
  });

  return new EmbedBuilder().setColor(0xffd700).setTitle('🏆 Ranking (global do bot) — Moedas').setDescription(linhas.join('\n'));
}

function montarEmbedCidades(ctx) {
  const todos = loadAll();
  const lista = Object.entries(todos)
    .filter(([, p]) => p.cidade?.fundada)
    .map(([id, p]) => ({ id, username: p.username, pontos: calcularPontuacao(p.cidade) }))
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 10);

  if (lista.length === 0) {
    return new EmbedBuilder().setColor(0x57c96b).setTitle('🏙️ Ranking de Cidades').setDescription('Nenhuma cidade fundada ainda. Use `/cidade` pra fundar a sua!');
  }

  const medalhas = ['🥇', '🥈', '🥉'];
  const linhas = lista.map((p, i) => {
    const posicao = medalhas[i] || `**${i + 1}.**`;
    const destaque = p.id === ctx.userId ? ' ⬅️ você' : '';
    return `${posicao} **${p.username}** — ⭐ ${p.pontos} pontos${destaque}`;
  });

  return new EmbedBuilder().setColor(0x57c96b).setTitle('🏆 Ranking (global do bot) — Cidades').setDescription(linhas.join('\n'));
}

function montarBotoes(modoAtivo) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('top_moedas').setLabel('Moedas').setEmoji('💰').setStyle(modoAtivo === 'moedas' ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('top_cidades').setLabel('Cidades').setEmoji('🏙️').setStyle(modoAtivo === 'cidades' ? ButtonStyle.Success : ButtonStyle.Secondary),
  );
  return [row];
}

async function topCore(ctx) {
  let modo = 'moedas';
  const msg = await ctx.send({ embeds: [montarEmbedMoedas(ctx)], components: montarBotoes(modo) });

  const collector = msg.createMessageComponentCollector({ time: 60_000 });

  collector.on('collect', async i => {
    modo = i.customId === 'top_cidades' ? 'cidades' : 'moedas';
    const embed = modo === 'cidades' ? montarEmbedCidades(ctx) : montarEmbedMoedas(ctx);
    await i.update({ embeds: [embed], components: montarBotoes(modo) });
  });

  collector.on('end', async () => {
    try { await msg.edit({ components: [] }); } catch { /* mensagem pode já ter sido apagada */ }
  });
}

module.exports = topCore;
