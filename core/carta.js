const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer } = require('../db');
const { buscarCartasPorNome } = require('../game/cards');
const { renderCartaDetalhe } = require('../game/gui');
const { nivelDe, aplicarEncantamento } = require('../game/enchant');

async function cartaCore(ctx, termo) {
  if (!termo || !termo.trim()) {
    await ctx.send({ content: 'Me diga o nome (ou parte do nome) da carta. Ex: `;carta excalibur`' });
    return;
  }

  const encontradas = buscarCartasPorNome(termo);

  if (encontradas.length === 0) {
    await ctx.send({ content: `Não achei nenhuma carta com o nome "${termo}". Confira em \`/inventario\` os nomes que você já tem, ou tente um termo mais simples.` });
    return;
  }

  if (encontradas.length > 1) {
    const lista = encontradas.slice(0, 10).map(c => `${c.emoji} **${c.nome}** (${c.raridade})`).join('\n');
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`🔎 ${encontradas.length} cartas encontradas para "${termo}"`)
      .setDescription(`${lista}\n\nSeja mais específico pra ver os detalhes de uma só.`);
    await ctx.send({ embeds: [embed] });
    return;
  }

  const carta = encontradas[0];
  const player = getPlayer(ctx.userId, ctx.username);
  const quantidade = player.colecao.filter(id => id === carta.id).length;
  const nivel = nivelDe(player, carta.id);
  const selo = Boolean(player.encantamentosArcanos?.[carta.id]);
  const cartaExibida = (nivel > 0 || selo) ? aplicarEncantamento(carta, nivel, selo) : carta;

  const buffer = await renderCartaDetalhe(cartaExibida, quantidade);
  const attachment = new AttachmentBuilder(buffer, { name: 'carta.png' });
  const partesInfo = [];
  if (nivel > 0) partesInfo.push(`✨ Encantamento: **+${nivel}**`);
  if (selo) partesInfo.push('🔮 **Selo Arcano** de Aldric ativo');
  const conteudo = partesInfo.length ? partesInfo.join(' · ') : undefined;
  await ctx.send({ content: conteudo, files: [attachment] });
}

module.exports = cartaCore;
