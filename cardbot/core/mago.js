const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { buscarCartasPorNome, RARIDADE_COR } = require('../game/cards');
const { BONUS_SELO_ARCANO } = require('../game/enchant');

// Aldric só reage de verdade quando o jogador tem Fragmentos Arcanos — o
// resto do tempo ele é só um NPC de cor (não usa IA, é tudo determinístico,
// igual ao resto do jogo: quem decide a recompensa é o código, não conversa fiada).
const FALAS_SEM_FRAGMENTO = [
  'Aldric ajeita os óculos e nem levanta os olhos do grimório. "Volte quando tiver algo... interessante."',
  '"Fragmentos Arcanos emanam dos andares mais profundos da masmorra, a partir do quarto andar. Continue descendo, aventureiro."',
  '"Sinto cheiro de mofo em você, não de magia. Traga um Fragmento Arcano e conversamos."',
  '"Há histórias de um espírito preso na masmorra que às vezes recompensa quem o ajuda com fragmentos raros..."',
];

async function magoCore(ctx, termo) {
  const player = getPlayer(ctx.userId, ctx.username);
  const fragmentos = player.fragmentosArcanos || 0;

  if (fragmentos <= 0) {
    const fala = FALAS_SEM_FRAGMENTO[Math.floor(Math.random() * FALAS_SEM_FRAGMENTO.length)];
    await ctx.send({
      embeds: [new EmbedBuilder()
        .setColor(0x5b2a86)
        .setAuthor({ name: 'Aldric, o Mago Arcano' })
        .setDescription(`🔮 "${fala}"`)
        .setFooter({ text: 'Fragmentos Arcanos podem ser encontrados em encontros raros na masmorra (a partir do andar 4), ou ajudando Vulto no andar 2+.' })],
    });
    return;
  }

  if (!termo || !termo.trim()) {
    await ctx.send({
      content: `Aldric ergue uma sobrancelha ao ver seu(s) **${fragmentos}** Fragmento(s) Arcano(s). Diga qual carta você quer selar. Ex: \`;mago excalibur\` ou \`/mago carta:excalibur\``,
    });
    return;
  }

  const candidatas = buscarCartasPorNome(termo).filter(c => player.colecao.includes(c.id));
  if (candidatas.length === 0) {
    await ctx.send({ content: `Você não tem nenhuma carta chamada "${termo}" para selar.` });
    return;
  }
  if (candidatas.length > 1) {
    const lista = candidatas.slice(0, 10).map(c => `${c.emoji} **${c.nome}**`).join('\n');
    await ctx.send({ content: `Encontrei mais de uma carta sua com esse termo, seja mais específico:\n${lista}` });
    return;
  }

  const carta = candidatas[0];
  if (player.encantamentosArcanos?.[carta.id]) {
    await ctx.send({ content: `✨ **${carta.nome}** já carrega o **Selo Arcano** de Aldric.` });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(RARIDADE_COR[carta.raridade])
    .setAuthor({ name: 'Aldric, o Mago Arcano' })
    .setTitle(`🔮 Selar ${carta.emoji} ${carta.nome}`)
    .setDescription(
      '"Esta carta pode carregar um **Selo Arcano** — um poder além dos encantamentos comuns do mercado ou da forja da Helena."\n\n' +
      `**Custo:** 1 Fragmento Arcano (você tem ${fragmentos})\n` +
      `**Efeito:** +${Math.round(BONUS_SELO_ARCANO * 100)}% de ataque/efeito permanente, empilhando com o encantamento normal da carta. Cada carta só pode receber 1 selo.`
    );

  const botao = new ButtonBuilder().setCustomId('confirmar_selo_arcano').setLabel('Selar carta (-1 Fragmento Arcano)').setEmoji('🔮').setStyle(ButtonStyle.Success);
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
  if ((atual.fragmentosArcanos || 0) <= 0) {
    await clique.update({ content: '❌ Você não tem mais Fragmentos Arcanos.', embeds: [], components: [] });
    return;
  }
  if (!atual.colecao.includes(carta.id)) {
    await clique.update({ content: '❌ Você não tem mais essa carta.', embeds: [], components: [] });
    return;
  }
  if (!atual.encantamentosArcanos) atual.encantamentosArcanos = {};
  if (atual.encantamentosArcanos[carta.id]) {
    await clique.update({ content: `✨ **${carta.nome}** já foi selada antes.`, embeds: [], components: [] });
    return;
  }

  atual.fragmentosArcanos -= 1;
  atual.encantamentosArcanos[carta.id] = true;
  savePlayer(ctx.userId, atual);

  const embedSucesso = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🔮 Selo Arcano aplicado!')
    .setDescription(`${carta.emoji} **${carta.nome}** agora brilha com magia ancestral — bônus permanente aplicado, empilhado com qualquer encantamento normal.`)
    .setFooter({ text: `Fragmentos Arcanos restantes: ${atual.fragmentosArcanos}` });
  await clique.update({ embeds: [embedSucesso], components: [] });
}

module.exports = magoCore;
