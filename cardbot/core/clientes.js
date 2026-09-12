const { EmbedBuilder } = require('discord.js');
const { getPlayer, loadAll } = require('../db');
const { tierCliente } = require('../game/ai');

const EMOJI_TIER = {
  'Lenda da Taverna': '👑',
  'Cliente Ouro': '🥇',
  'Cliente Prata': '🥈',
  'Frequês': '🍺',
  Forasteiro: '🚪',
};

// Pontuação usada só pra ordenar o ranking (não é exibida ao jogador) —
// gorjeta vale mais que visita simples, mas visitas frequentes também contam.
function pontuacao(taverneiro) {
  return (taverneiro?.totalGorjetas || 0) + (taverneiro?.visitas || 0) * 5;
}

async function clientesCore(ctx) {
  const todos = loadAll();
  const jogadores = Object.entries(todos)
    .map(([id, p]) => ({ id, username: p.username, taverneiro: p.taverneiro }))
    .filter(p => (p.taverneiro?.visitas || 0) > 0)
    .sort((a, b) => pontuacao(b.taverneiro) - pontuacao(a.taverneiro));

  if (jogadores.length === 0) {
    await ctx.send({ content: 'Ainda não há clientes registrados na taverna. Use `/taverneiro` ou `;taverneiro` para conversar com Thomas!' });
    return;
  }

  const top10 = jogadores.slice(0, 10);
  const linhas = top10.map((p, idx) => {
    const tier = tierCliente(p.taverneiro);
    const medalha = idx === 0 ? '🏆' : `${idx + 1}.`;
    return `${medalha} **${p.username}** — ${EMOJI_TIER[tier]} ${tier} · ${p.taverneiro.visitas} visitas · ${p.taverneiro.totalGorjetas || 0} moedas em gorjetas`;
  });

  const player = getPlayer(ctx.userId, ctx.username);
  const meuTier = tierCliente(player.taverneiro);
  const minhaPosicao = jogadores.findIndex(p => p.id === ctx.userId) + 1;

  const embed = new EmbedBuilder()
    .setColor(0xd9a441)
    .setTitle('🍺 Clientes mais fiéis da Taverna')
    .setDescription(linhas.join('\n'))
    .setFooter({
      text: minhaPosicao > 0
        ? `Você: ${EMOJI_TIER[meuTier]} ${meuTier} · posição #${minhaPosicao} de ${jogadores.length}`
        : `Você ainda não é cliente da taverna — fale com Thomas pra começar!`,
    });

  await ctx.send({ embeds: [embed] });
}

module.exports = clientesCore;
