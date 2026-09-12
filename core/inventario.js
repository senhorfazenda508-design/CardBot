const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPlayer } = require('../db');
const { renderInventario } = require('../game/gui');
const { CARDS, RARIDADE_COR, RARIDADE_ORDEM } = require('../game/cards');

const RARIDADE_EMOJI = {
  Comum: '⚪',
  Incomum: '🟢',
  Raro: '🔵',
  'Épico': '🟣',
  'Lendário': '🟡',
  'Mítico': '💠',
  'Ancestral': '🔴',
};

function contarPorRaridade(colecao) {
  const contagem = Object.fromEntries(RARIDADE_ORDEM.map(r => [r, 0]));
  for (const id of colecao) {
    const c = CARDS[id];
    if (c) contagem[c.raridade]++;
  }
  return contagem;
}

// Agrupa a coleção por raridade e monta, para cada uma, a lista de nomes de
// carta com quantidade (x2, x3...) e nível de encantamento (+3), em texto —
// assim dá pra ler os nomes sem depender só da imagem.
function montarListasPorRaridade(colecao, encantamentos, encantamentosArcanos) {
  const contagemPorId = {};
  for (const id of colecao) {
    if (!CARDS[id]) continue;
    contagemPorId[id] = (contagemPorId[id] || 0) + 1;
  }

  const listas = {};
  for (const rar of RARIDADE_ORDEM) listas[rar] = [];

  for (const [id, qtd] of Object.entries(contagemPorId)) {
    const carta = CARDS[id];
    const nivel = encantamentos?.[id] || 0;
    const sufixoQtd = qtd > 1 ? ` x${qtd}` : '';
    const sufixoNivel = nivel > 0 ? ` +${nivel}` : '';
    const sufixoSelo = encantamentosArcanos?.[id] ? ' 🔮' : '';
    listas[carta.raridade].push(`${carta.emoji} ${carta.nome}${sufixoQtd}${sufixoNivel}${sufixoSelo}`);
  }

  return listas;
}

// Monta o embed no mesmo espírito visual da loja: título, resumo e um "field" por
// raridade contendo o TEXTO com os nomes das cartas daquela raridade.
function montarEmbedInventario(username, colecao, filtro, encantamentos, encantamentosArcanos) {
  const contagem = contarPorRaridade(colecao);
  const listas = montarListasPorRaridade(colecao, encantamentos, encantamentosArcanos);
  const unicos = new Set(colecao.filter(id => CARDS[id])).size;

  const embed = new EmbedBuilder()
    .setColor(filtro ? RARIDADE_COR[filtro] : 0x5865f2)
    .setTitle(`🎒 Inventário de ${username}`)
    .setDescription(`Você tem **${colecao.length}** cartas (**${unicos}** tipos diferentes).${filtro ? `\nFiltrando por: **${filtro}**` : ''}`)
    .setImage('attachment://inventario.png');

  for (const rar of RARIDADE_ORDEM) {
    if (contagem[rar] === 0) continue;
    if (filtro && rar !== filtro) continue;
    let texto = listas[rar].join('\n');
    if (texto.length > 1024) texto = texto.slice(0, 1000) + '\n…';
    embed.addFields({ name: `${RARIDADE_EMOJI[rar]} ${rar} (${contagem[rar]})`, value: texto });
  }

  return embed;
}

// Botões de filtro por raridade — igual em espírito aos botões de pacote da loja
function montarBotoesFiltro(colecao, filtroAtivo) {
  const contagem = contarPorRaridade(colecao);
  const disponiveis = RARIDADE_ORDEM.filter(r => contagem[r] > 0);

  const opcoes = [{ id: 'filtro_todos', label: 'Todos', emoji: '📦' }, ...disponiveis.map(r => ({
    id: `filtro_${r}`,
    label: r,
    emoji: RARIDADE_EMOJI[r],
  }))];

  const linhas = [];
  for (let i = 0; i < opcoes.length; i += 4) {
    const row = new ActionRowBuilder();
    for (const op of opcoes.slice(i, i + 4)) {
      const raridadeDoBotao = op.id === 'filtro_todos' ? null : op.label;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(op.id)
          .setLabel(op.label)
          .setEmoji(op.emoji)
          .setStyle(raridadeDoBotao === filtroAtivo ? ButtonStyle.Success : ButtonStyle.Secondary)
      );
    }
    linhas.push(row);
  }
  return linhas;
}

async function montarPayload(ctx, colecao, filtro, encantamentos, encantamentosArcanos) {
  const buffer = await renderInventario(ctx.username, colecao, filtro);
  const attachment = new AttachmentBuilder(buffer, { name: 'inventario.png' });
  return {
    embeds: [montarEmbedInventario(ctx.username, colecao, filtro, encantamentos, encantamentosArcanos)],
    files: [attachment],
    components: montarBotoesFiltro(colecao, filtro),
  };
}

async function inventarioCore(ctx) {
  const player = getPlayer(ctx.userId, ctx.username);

  if (player.colecao.length === 0) {
    await ctx.send({ content: 'Você ainda não tem nenhuma carta. Use `/explorar` ou `;adv` para começar!' });
    return;
  }

  let filtro = null;
  const msg = await ctx.send(await montarPayload(ctx, player.colecao, filtro, player.encantamentos, player.encantamentosArcanos));

  const collector = msg.createMessageComponentCollector({ time: 60_000 });

  collector.on('collect', async i => {
    if (i.user.id !== ctx.userId) {
      await i.reply({ content: 'Esse inventário não é seu! Use `/inventario` ou `;inventario` para abrir o seu.', ephemeral: true });
      return;
    }

    filtro = i.customId === 'filtro_todos' ? null : i.customId.replace('filtro_', '');
    const atual = getPlayer(ctx.userId, ctx.username);
    await i.update(await montarPayload(ctx, atual.colecao, filtro, atual.encantamentos, atual.encantamentosArcanos));
  });

  collector.on('end', async () => {
    try { await msg.edit({ components: [] }); } catch { /* mensagem pode já ter sido apagada */ }
  });
}

module.exports = inventarioCore;
