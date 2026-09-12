const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { buscarCartasPorNome, RARIDADE_COR } = require('../game/cards');
const { NIVEL_MAXIMO, copiasNecessarias, custoMoedas, nivelDe, aplicarEncantamento } = require('../game/enchant');

async function encantarCore(ctx, termo) {
  if (!termo || !termo.trim()) {
    await ctx.send({ content: 'Me diga qual carta encantar. Ex: `;encantar excalibur`' });
    return;
  }

  const player = getPlayer(ctx.userId, ctx.username);
  const candidatas = buscarCartasPorNome(termo).filter(c => player.colecao.includes(c.id));

  if (candidatas.length === 0) {
    await ctx.send({ content: `Você não tem nenhuma carta chamada "${termo}" pra encantar.` });
    return;
  }
  if (candidatas.length > 1) {
    const lista = candidatas.slice(0, 10).map(c => `${c.emoji} **${c.nome}**`).join('\n');
    await ctx.send({ content: `Encontrei mais de uma carta sua com esse termo, seja mais específico:\n${lista}` });
    return;
  }

  const carta = candidatas[0];
  const possuidas = player.colecao.filter(id => id === carta.id).length;
  const nivelAtual = nivelDe(player, carta.id);

  if (nivelAtual >= NIVEL_MAXIMO) {
    await ctx.send({ content: `✨ **${carta.nome}** já está no nível máximo de encantamento (+${NIVEL_MAXIMO}).` });
    return;
  }

  const copiasCusto = copiasNecessarias(nivelAtual);
  const moedasCusto = custoMoedas(carta, nivelAtual);
  const cartaPreview = aplicarEncantamento(carta, nivelAtual + 1);

  const podePagar = possuidas > copiasCusto && player.moedas >= moedasCusto;
  // > copiasCusto (não >=) porque precisamos manter ao menos 1 cópia jogável depois de consumir o material

  const embed = new EmbedBuilder()
    .setColor(RARIDADE_COR[carta.raridade])
    .setTitle(`✨ Encantar ${carta.emoji} ${carta.nome}`)
    .setDescription(
      `Nível atual: **+${nivelAtual}** → próximo: **+${nivelAtual + 1}**\n` +
      `Ataque: **${carta.ataque === cartaPreview.ataque ? carta.ataque : `${aplicarEncantamento(carta, nivelAtual).ataque} → ${cartaPreview.ataque}`}**\n\n` +
      `**Custo:** ${copiasCusto} cópia(s) de ${carta.nome} + **${moedasCusto}** moedas\n` +
      `Você tem: ${possuidas} cópia(s) · ${player.moedas} moedas`
    );

  if (!podePagar) {
    embed.addFields({
      name: '❌ Não é possível encantar agora',
      value: possuidas <= copiasCusto
        ? `Você precisa de mais cópias de **${carta.nome}** (precisa ter mais que ${copiasCusto}, guardando 1 para continuar usando).`
        : 'Moedas insuficientes.',
    });
    await ctx.send({ embeds: [embed] });
    return;
  }

  const botao = new ButtonBuilder().setCustomId('confirmar_encantar').setLabel(`Encantar por ${moedasCusto} moedas`).setEmoji('✨').setStyle(ButtonStyle.Success);
  const linha = new ActionRowBuilder().addComponents(botao);

  const msg = await ctx.send({ embeds: [embed], components: [linha] });

  let clique;
  try {
    clique = await msg.awaitMessageComponent({ filter: i => i.user.id === ctx.userId, time: 30_000 });
  } catch {
    try { await msg.edit({ components: [] }); } catch {}
    return;
  }

  const atual = getPlayer(ctx.userId, ctx.username);
  const possuidasAgora = atual.colecao.filter(id => id === carta.id).length;
  if (possuidasAgora <= copiasCusto || atual.moedas < moedasCusto) {
    await clique.update({ content: '❌ Algo mudou (moedas ou cópias insuficientes agora). Tente de novo.', embeds: [], components: [] });
    return;
  }

  let removidas = 0;
  atual.colecao = atual.colecao.filter(id => {
    if (id === carta.id && removidas < copiasCusto) {
      removidas++;
      return false;
    }
    return true;
  });
  atual.moedas -= moedasCusto;
  atual.encantamentos[carta.id] = nivelAtual + 1;
  savePlayer(ctx.userId, atual);

  const embedSucesso = new EmbedBuilder()
    .setColor(RARIDADE_COR[carta.raridade])
    .setTitle('✨ Carta encantada!')
    .setDescription(`${carta.emoji} **${carta.nome}** agora está em **+${nivelAtual + 1}**!\nAtaque atual: **${cartaPreview.ataque}**`)
    .setFooter({ text: `Saldo: ${atual.moedas} moedas` });

  await clique.update({ embeds: [embedSucesso], components: [] });
}

module.exports = encantarCore;
