
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { CARDS, RARIDADE_ORDEM, RARIDADE_COR } = require('../game/cards');

const RARIDADE_EMOJI = {
  Ancestral: '🔴',
  Mítico: '💠',
  Lendário: '🟡',
  Épico: '🟣',
  Raro: '🔵',
  Incomum: '🟢',
  Comum: '⚪',
};

const RARIDADE_SLUG = {
  Ancestral: 'ancestral',
  Mítico: 'mitico',
  Lendário: 'lendario',
  Épico: 'epico',
  Raro: 'raro',
  Incomum: 'incomum',
  Comum: 'comum',
};

const SLUG_RARIDADE = Object.fromEntries(
  Object.entries(RARIDADE_SLUG).map(([raridade, slug]) => [slug, raridade])
);

function cartasDaRaridade(raridade) {
  return Object.values(CARDS)
    .filter(c => c.raridade === raridade)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function montarEmbed(raridade) {
  const cartas = cartasDaRaridade(raridade);
  const lista = cartas.length
    ? cartas.map((c, i) => `${i + 1}. ${c.nome}`).join('\n')
    : 'Nenhuma carta encontrada nessa raridade.';

  return new EmbedBuilder()
    .setColor(RARIDADE_COR[raridade] || 0x5865f2)
    .setTitle('📚 Cartas por raridade')
    .setDescription(
      `**Raridade atual:** ${RARIDADE_EMOJI[raridade] || '•'} **${raridade}**\n` +
      `**Total:** ${cartas.length}\n\n${lista}\n\n` +
      'Clique nos botões de baixo pra trocar a raridade.'
    );
}

function montarBotoes(raridadeAtual) {
  const botoes = RARIDADE_ORDEM.map(raridade => (
    new ButtonBuilder()
      .setCustomId(`raridades:${RARIDADE_SLUG[raridade]}`)
      .setLabel(raridade)
      .setEmoji(RARIDADE_EMOJI[raridade])
      .setStyle(raridade === raridadeAtual ? ButtonStyle.Success : ButtonStyle.Secondary)
  ));

  const linhas = [];
  for (let i = 0; i < botoes.length; i += 4) {
    linhas.push(new ActionRowBuilder().addComponents(botoes.slice(i, i + 4)));
  }
  return linhas;
}

async function raridadesCore(ctx) {
  let raridadeAtual = 'Comum';

  const msg = await ctx.send({
    embeds: [montarEmbed(raridadeAtual)],
    components: montarBotoes(raridadeAtual),
  });

  const collector = msg.createMessageComponentCollector({ time: 60_000 });

  collector.on('collect', async i => {
    if (!i.customId.startsWith('raridades:')) return;

    if (i.user.id !== ctx.userId) {
      await i.reply({
        content: 'Esse painel não é seu. Abre o teu, caramba.',
        ephemeral: true,
      });
      return;
    }

    const slug = i.customId.split(':')[1];
    const novaRaridade = SLUG_RARIDADE[slug];
    if (!novaRaridade) {
      await i.reply({ content: 'Raridade inválida.', ephemeral: true });
      return;
    }

    raridadeAtual = novaRaridade;
    await i.update({
      embeds: [montarEmbed(raridadeAtual)],
      components: montarBotoes(raridadeAtual),
    });
  });

  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch {
      // mensagem pode ter sido apagada
    }
  });
}

module.exports = raridadesCore;
