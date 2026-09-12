// Painel de administração do bot.
//
// Cada função aqui corresponde a um subcomando de /admin (ver commands/admin.js)
// e de ;admin (ver lib/prefixCommands.js) — os dois caminhos chamam exatamente
// as mesmas funções, então o comportamento é idêntico não importa como o
// admin chamou.
//
// Toda função checa `ehAdmin(ctx)` de novo aqui dentro (defesa em profundidade:
// mesmo que algum dia um comando novo esqueça de checar permissão lá em cima,
// nada destrutivo roda sem essa checagem).

const { EmbedBuilder } = require('discord.js');
const { getPlayer, savePlayer, loadAll, defaultPlayer, cidadePadrao } = require('../db');
const { ehAdmin } = require('../lib/adminAuth');
const { CARDS, buscarCartasPorNome } = require('../game/cards');
const { ARMADURAS, buscarArmaduraPorNome } = require('../game/armor');
const { PERKS, buscarPerkPorNome } = require('../game/perks');
const { buscarNPC, idsConvidaveis } = require('../game/npcs');
const { estadoPadraoNPC } = require('../game/npcEngine');
const { obterPersonaExtra, definirPersonaExtra, resetarPersonaExtra } = require('../game/npcPersona');
const { RECURSOS_INFO, sortearRecursoMasmorra } = require('../game/city');

const COR_ADMIN = 0xff3860;
const RECURSOS_VALIDOS = ['madeira', 'pedra', 'comida', 'ouro'];

function embedAdmin(titulo, descricao) {
  return new EmbedBuilder().setColor(COR_ADMIN).setAuthor({ name: `🛠️ ${titulo}` }).setDescription(descricao);
}

async function negarAcesso(ctx) {
  await ctx.send({
    content: '⛔ Esse comando é só pra administradores do servidor (permissão "Gerenciar Servidor") ou donos do bot.',
    ephemeral: true,
  });
}

function resolverCarta(termo) {
  if (!termo) return null;
  if (CARDS[termo]) return CARDS[termo];
  return buscarCartasPorNome(termo)[0] || null;
}
function resolverArmadura(termo) {
  if (!termo) return null;
  if (ARMADURAS[termo]) return ARMADURAS[termo];
  return buscarArmaduraPorNome(termo)[0] || null;
}
function resolverPerk(termo) {
  if (!termo) return null;
  if (PERKS[termo]) return PERKS[termo];
  return buscarPerkPorNome(termo)[0] || null;
}

// ---------------------------------------------------------------- jogador --

async function adminMoedas(ctx, alvoUser, quantidade) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador (menção ou seleção de usuário).' });
  if (!Number.isFinite(quantidade) || !Number.isInteger(quantidade)) {
    return ctx.send({ content: 'A quantidade precisa ser um número inteiro (pode ser negativo, pra remover).' });
  }
  const player = getPlayer(alvoUser.id, alvoUser.username);
  player.moedas = Math.max(0, player.moedas + quantidade);
  savePlayer(alvoUser.id, player);
  const sinal = quantidade >= 0 ? '+' : '';
  await ctx.send({
    embeds: [embedAdmin('Moedas ajustadas', `<@${alvoUser.id}>: ${sinal}${quantidade} moedas.\nSaldo na carteira agora: 🪙 **${player.moedas}**`)],
  });
}

async function adminBanco(ctx, alvoUser, quantidade) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  if (!Number.isFinite(quantidade) || !Number.isInteger(quantidade)) {
    return ctx.send({ content: 'A quantidade precisa ser um número inteiro.' });
  }
  const player = getPlayer(alvoUser.id, alvoUser.username);
  player.banco.saldo = Math.max(0, player.banco.saldo + quantidade);
  savePlayer(alvoUser.id, player);
  const sinal = quantidade >= 0 ? '+' : '';
  await ctx.send({
    embeds: [embedAdmin('Banco ajustado', `<@${alvoUser.id}>: ${sinal}${quantidade} moedas no banco.\nSaldo no banco agora: 🏦 **${player.banco.saldo}**`)],
  });
}

async function adminCarta(ctx, alvoUser, termoCarta, quantidade = 1) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  const carta = resolverCarta(termoCarta);
  if (!carta) return ctx.send({ content: `Não encontrei nenhuma carta chamada "${termoCarta}". Tente o nome exato ou o id (ex: \`comum_espada\`).` });
  const qtd = Math.min(50, Math.max(1, Math.floor(quantidade) || 1));

  const player = getPlayer(alvoUser.id, alvoUser.username);
  for (let i = 0; i < qtd; i++) player.colecao.push(carta.id);
  savePlayer(alvoUser.id, player);

  await ctx.send({
    embeds: [embedAdmin('Cartas entregues', `<@${alvoUser.id}> recebeu ${carta.emoji} **${qtd}x ${carta.nome}** (${carta.raridade}).\nColeção agora tem **${player.colecao.length}** cartas.`)],
  });
}

async function adminRemoverCarta(ctx, alvoUser, termoCarta, quantidade = 1) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  const carta = resolverCarta(termoCarta);
  if (!carta) return ctx.send({ content: `Não encontrei nenhuma carta chamada "${termoCarta}".` });
  const qtd = Math.max(1, Math.floor(quantidade) || 1);

  const player = getPlayer(alvoUser.id, alvoUser.username);
  let removidas = 0;
  for (let i = player.colecao.length - 1; i >= 0 && removidas < qtd; i--) {
    if (player.colecao[i] === carta.id) {
      player.colecao.splice(i, 1);
      removidas++;
    }
  }
  savePlayer(alvoUser.id, player);

  await ctx.send({
    embeds: [embedAdmin('Cartas removidas', `Removidas ${removidas}x ${carta.emoji} **${carta.nome}** de <@${alvoUser.id}> (pediu ${qtd}).\nColeção agora tem **${player.colecao.length}** cartas.`)],
  });
}

async function adminArmadura(ctx, alvoUser, termoArmadura) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  const armadura = resolverArmadura(termoArmadura);
  if (!armadura) return ctx.send({ content: `Não encontrei nenhuma armadura chamada "${termoArmadura}".` });

  const player = getPlayer(alvoUser.id, alvoUser.username);
  if (player.armaduras.includes(armadura.id)) {
    return ctx.send({ content: `<@${alvoUser.id}> já tem ${armadura.emoji} **${armadura.nome}**.` });
  }
  player.armaduras.push(armadura.id);
  savePlayer(alvoUser.id, player);

  await ctx.send({ embeds: [embedAdmin('Armadura entregue', `<@${alvoUser.id}> recebeu ${armadura.emoji} **${armadura.nome}** (${armadura.raridade}). Ele(a) pode equipar com \`/armadura\`.`)] });
}

async function adminPerk(ctx, alvoUser, termoPerk) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  const perk = resolverPerk(termoPerk);
  if (!perk) return ctx.send({ content: `Não encontrei nenhuma perk chamada "${termoPerk}".` });

  const player = getPlayer(alvoUser.id, alvoUser.username);
  if (player.perks.includes(perk.id)) {
    return ctx.send({ content: `<@${alvoUser.id}> já tem a perk **${perk.nome}**.` });
  }
  player.perks.push(perk.id);
  savePlayer(alvoUser.id, player);

  await ctx.send({ embeds: [embedAdmin('Perk entregue', `<@${alvoUser.id}> recebeu ${perk.emoji} **${perk.nome}** (${perk.tipo}). Ele(a) pode equipar com \`/perks\`.`)] });
}

async function adminFragmentos(ctx, alvoUser, quantidade) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  if (!Number.isFinite(quantidade) || !Number.isInteger(quantidade)) {
    return ctx.send({ content: 'A quantidade precisa ser um número inteiro.' });
  }
  const player = getPlayer(alvoUser.id, alvoUser.username);
  player.fragmentosArcanos = Math.max(0, (player.fragmentosArcanos || 0) + quantidade);
  savePlayer(alvoUser.id, player);
  const sinal = quantidade >= 0 ? '+' : '';
  await ctx.send({ embeds: [embedAdmin('Fragmentos Arcanos ajustados', `<@${alvoUser.id}>: ${sinal}${quantidade}.\nTotal agora: 🔮 **${player.fragmentosArcanos}**`)] });
}

async function adminResetarJogador(ctx, alvoUser, confirmar) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  if (!confirmar) {
    return ctx.send({
      content: `⚠️ Isso vai **apagar TUDO** de <@${alvoUser.id}> (moedas, cartas, cidade, memória com NPCs, tudo) e recomeçar do zero. Rode de novo com \`confirmar: true\` (ou \`;admin jogador resetar @${alvoUser.username} sim\`) se tem certeza.`,
    });
  }
  savePlayer(alvoUser.id, defaultPlayer(alvoUser.username));
  await ctx.send({ embeds: [embedAdmin('Jogador resetado', `<@${alvoUser.id}> foi resetado(a) pro estado inicial do jogo.`)] });
}

async function adminPerfilDebug(ctx, alvoUser) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  const p = getPlayer(alvoUser.id, alvoUser.username);
  const npcsConvidados = Object.entries(p.npcs || {}).filter(([, e]) => e?.convidado).map(([id]) => id);

  const linhas = [
    `🪙 Carteira: **${p.moedas}** · 🏦 Banco: **${p.banco.saldo}** · 🔮 Fragmentos: **${p.fragmentosArcanos}**`,
    `🃏 Cartas: **${p.colecao.length}** · 🥋 Armaduras: **${p.armaduras.length}** (equipada: ${p.equipamento.armadura || 'nenhuma'}) · ✨ Perks: **${p.perks.length}**`,
    `🏰 Cidade: ${p.cidade.fundada ? `**${p.cidade.nome}** fundada` : 'não fundada'} · Recursos: ${RECURSOS_VALIDOS.map(r => `${r} ${Math.floor(p.cidade.recursos[r] || 0)}`).join(', ')}`,
    `🏘️ Moradores convidados: ${npcsConvidados.length > 0 ? npcsConvidados.join(', ') : 'nenhum'}`,
    `🍺 Taverneiro: ${p.taverneiro.visitas} visitas, ${p.taverneiro.totalGorjetas} moedas em gorjetas`,
    `⚔️ Run ativa: ${p.run.ativa ? `sim, andar ${p.run.andar} (${p.run.hp}/${p.run.hpMax} HP)` : 'não'}`,
    `📊 Estatísticas: ${p.estatisticas.vitorias}V / ${p.estatisticas.derrotas}D · Maior andar: ${p.estatisticas.maiorAndar}`,
    `🗡️ Roubo: cooldown ${p.roubo.ultimoRoubo ? 'ativo' : 'livre'}, proteção ${p.roubo.protegidoAte > Date.now() ? 'ativa' : 'livre'}`,
    `🔥 Streak diário: ${p.streakDiario}`,
  ];

  await ctx.send({
    embeds: [
      embedAdmin(`Perfil técnico — ${p.username}`, linhas.join('\n')).setFooter({ text: `ID: ${alvoUser.id}` }),
    ],
  });
}

// ------------------------------------------------------------------ cidade --

async function adminCidadeRecursos(ctx, alvoUser, recurso, quantidade) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  const r = (recurso || '').toLowerCase();
  if (!RECURSOS_VALIDOS.includes(r)) {
    return ctx.send({ content: `Recurso inválido. Use um destes: ${RECURSOS_VALIDOS.join(', ')}.` });
  }
  if (!Number.isFinite(quantidade) || !Number.isInteger(quantidade)) {
    return ctx.send({ content: 'A quantidade precisa ser um número inteiro.' });
  }
  const player = getPlayer(alvoUser.id, alvoUser.username);
  if (!player.cidade.fundada) return ctx.send({ content: `<@${alvoUser.id}> ainda não fundou uma cidade.` });
  player.cidade.recursos[r] = Math.max(0, (player.cidade.recursos[r] || 0) + quantidade);
  savePlayer(alvoUser.id, player);
  const sinal = quantidade >= 0 ? '+' : '';
  await ctx.send({ embeds: [embedAdmin('Recursos da cidade ajustados', `<@${alvoUser.id}>: ${sinal}${quantidade} de ${r}.\nAgora: **${Math.floor(player.cidade.recursos[r])}**`)] });
}

// Dispara manualmente o "saque de recursos de masmorra" (game/city.js) num
// jogador — útil pra admin testar/dar um empurrão, sem exigir cidade
// fundada, já que esse tipo de recurso existe em player.cidade.recursos
// desde o início (ver db.js -> cidadePadrao), fundada ou não.
async function adminSaqueRecursos(ctx, alvoUser) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });

  const player = getPlayer(alvoUser.id, alvoUser.username);
  if (!player.cidade.recursos) player.cidade.recursos = { madeira: 0, pedra: 0, comida: 0, ouro: 0 };

  const andarRef = player.run?.ativa ? player.run.andar : (player.estatisticas?.maiorAndar || 1);
  const { recurso, quantidade } = sortearRecursoMasmorra(andarRef);
  player.cidade.recursos[recurso] = (player.cidade.recursos[recurso] || 0) + quantidade;
  savePlayer(alvoUser.id, player);

  await ctx.send({
    embeds: [embedAdmin(
      'Saque de masmorra simulado',
      `<@${alvoUser.id}> achou ${RECURSOS_INFO[recurso].emoji} **${quantidade} de ${RECURSOS_INFO[recurso].nome}** ` +
      `(funciona mesmo sem cidade fundada — fica guardado pra quando ele(a) fundar).\n` +
      `Total agora: **${Math.floor(player.cidade.recursos[recurso])}** de ${recurso}.`
    )],
  });
}

async function adminCidadeResetar(ctx, alvoUser, confirmar) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  if (!confirmar) {
    return ctx.send({ content: `⚠️ Isso vai apagar a cidade de <@${alvoUser.id}> (edifícios, recursos, tudo). Rode de novo com \`confirmar: true\` se tem certeza.` });
  }
  const player = getPlayer(alvoUser.id, alvoUser.username);
  player.cidade = cidadePadrao();
  savePlayer(alvoUser.id, player);
  await ctx.send({ embeds: [embedAdmin('Cidade resetada', `A cidade de <@${alvoUser.id}> foi resetada. Ele(a) pode fundar uma nova com \`/cidade\`.`)] });
}

// --------------------------------------------------------------------- npc --

async function adminNpcConvidar(ctx, alvoUser, termoNpc) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  const npc = buscarNPC(termoNpc);
  if (!npc || !idsConvidaveis().includes(npc.id)) {
    return ctx.send({ content: `NPC inválido ou não convidável. Convidáveis: ${idsConvidaveis().join(', ')}.` });
  }
  const player = getPlayer(alvoUser.id, alvoUser.username);
  if (!player.npcs) player.npcs = {};
  if (player.npcs[npc.id]?.convidado) {
    return ctx.send({ content: `${npc.nome} já mora na vila de <@${alvoUser.id}>.` });
  }
  player.npcs[npc.id] = { ...estadoPadraoNPC(), convidado: true, convidadoEm: Date.now() };
  savePlayer(alvoUser.id, player);
  await ctx.send({ embeds: [embedAdmin('Morador convidado à força 😄', `${npc.emoji} **${npc.nome}** agora mora na vila de <@${alvoUser.id}> (grátis, via admin).`)] });
}

async function adminNpcResetarMemoria(ctx, alvoUser, termo) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  const player = getPlayer(alvoUser.id, alvoUser.username);
  const alvo = (termo || '').trim().toLowerCase();

  if (alvo === 'todos') {
    player.taverneiro.historico = [];
    player.narrador.historico = [];
    for (const estado of Object.values(player.npcs || {})) estado.historico = [];
    savePlayer(alvoUser.id, player);
    return ctx.send({ embeds: [embedAdmin('Memória zerada', `Toda a memória de conversa (Thomas, Narrador e moradores) de <@${alvoUser.id}> foi apagada.`)] });
  }
  if (alvo === 'narrador') {
    player.narrador.historico = [];
    savePlayer(alvoUser.id, player);
    return ctx.send({ embeds: [embedAdmin('Memória zerada', `Memória do Narrador (/ia) de <@${alvoUser.id}> foi apagada.`)] });
  }
  if (alvo === 'taverneiro' || alvo === 'thomas') {
    player.taverneiro.historico = [];
    savePlayer(alvoUser.id, player);
    return ctx.send({ embeds: [embedAdmin('Memória zerada', `Memória do Thomas com <@${alvoUser.id}> foi apagada.`)] });
  }
  const npc = buscarNPC(alvo);
  if (npc && player.npcs?.[npc.id]) {
    player.npcs[npc.id].historico = [];
    savePlayer(alvoUser.id, player);
    return ctx.send({ embeds: [embedAdmin('Memória zerada', `Memória de ${npc.nome} com <@${alvoUser.id}> foi apagada.`)] });
  }
  await ctx.send({ content: 'NPC não encontrado (ou o jogador nunca conversou com ele). Use `todos`, `narrador`, `taverneiro`, ou o nome de um morador convidado.' });
}

// "taverneiro"/"thomas" apontam pro Thomas (game/ai.js), que não está na
// lista de game/npcs.js com esse mesmo nome (ver comentário lá no topo).
function resolverNpcParaAdmin(termo) {
  const alvo = String(termo || '').trim().toLowerCase();
  if (!alvo) return null;
  if (alvo === 'taverneiro' || alvo === 'thomas') return { id: 'taverneiro', nome: 'Thomas, o Taverneiro' };
  const npc = buscarNPC(alvo);
  return npc ? { id: npc.id, nome: npc.nome } : null;
}

// Define/consulta/reseta como um NPC deve agir e de qual época ele deve
// "parecer" ser, por servidor (game/npcPersona.js). Isso é por servidor, não
// por jogador — por isso não recebe alvoUser.
async function adminNpcPersonalidade(ctx, termoNpc, { texto, epoca, resetar } = {}) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!ctx.guildId) {
    return ctx.send({ content: '❌ Esse comando só funciona dentro de um servidor (não em DM), porque o ajuste é configurado por servidor.' });
  }
  const alvo = resolverNpcParaAdmin(termoNpc);
  if (!alvo) {
    return ctx.send({ content: `Não encontrei nenhum NPC chamado "${termoNpc}". Tente "taverneiro", "mago", ou o nome/id de um morador (helena, isadora, crianca, eremita, vulto).` });
  }

  if (resetar) {
    resetarPersonaExtra(ctx.guildId, alvo.id);
    return ctx.send({ embeds: [embedAdmin('Personalidade resetada', `${alvo.nome} voltou ao comportamento/época padrão neste servidor.`)] });
  }

  const semMudanca = !texto?.trim() && !epoca?.trim();
  if (semMudanca) {
    const atual = obterPersonaExtra(ctx.guildId, alvo.id);
    const descricao = atual
      ? [
          atual.texto ? `**Como deve agir:**\n> ${atual.texto}` : null,
          atual.epoca ? `**Época/ano:**\n> ${atual.epoca}` : null,
        ].filter(Boolean).join('\n\n')
      : 'Nenhum ajuste customizado — comportamento/época padrão do NPC.';
    return ctx.send({
      embeds: [embedAdmin(`Personalidade de ${alvo.nome}`, descricao)
        .setFooter({ text: 'Use os campos "texto"/"epoca" pra definir, ou "resetar: true" pra voltar ao padrão.' })],
    });
  }

  const salvo = definirPersonaExtra(ctx.guildId, alvo.id, { texto: texto || undefined, epoca: epoca || undefined });
  const descricaoSalva = [
    salvo?.texto ? `**Como deve agir:**\n> ${salvo.texto}` : null,
    salvo?.epoca ? `**Época/ano:**\n> ${salvo.epoca}` : null,
  ].filter(Boolean).join('\n\n');
  await ctx.send({
    embeds: [embedAdmin(`Personalidade de ${alvo.nome} atualizada`, descricaoSalva)
      .setFooter({ text: 'As regras de segurança e os limites de moedas/desconto do NPC continuam valendo por cima disso, sempre.' })],
  });
}

// Zera o "de mal de verdade" (ver game/npcEngine.js) de um jogador com um NPC
// específico, caso um admin ache que precisa intervir manualmente.
async function adminNpcLiberar(ctx, alvoUser, termoNpc) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  const player = getPlayer(alvoUser.id, alvoUser.username);
  const alvo = resolverNpcParaAdmin(termoNpc);
  if (!alvo) return ctx.send({ content: `NPC não encontrado. Use "taverneiro" ou o nome de um morador convidado.` });

  const estado = alvo.id === 'taverneiro' ? player.taverneiro : player.npcs?.[alvo.id];
  if (!estado) {
    return ctx.send({ content: `${alvo.nome} nem se conhece com <@${alvoUser.id}> ainda (nunca convidado/conversado).` });
  }
  estado.deMalAte = 0;
  estado.avisos = 0;
  savePlayer(alvoUser.id, player);
  await ctx.send({ embeds: [embedAdmin('Fizeram as pazes 🤝', `${alvo.nome} não está mais de mal com <@${alvoUser.id}> e voltou ao normal.`)] });
}

// -------------------------------------------------------------------- roubo --

async function adminRoubarLimpar(ctx, alvoUser) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!alvoUser) return ctx.send({ content: 'Informe o jogador.' });
  const player = getPlayer(alvoUser.id, alvoUser.username);
  player.roubo = { ultimoRoubo: 0, protegidoAte: 0 };
  savePlayer(alvoUser.id, player);
  await ctx.send({ embeds: [embedAdmin('Roubo resetado', `Cooldown e proteção de roubo de <@${alvoUser.id}> foram zerados.`)] });
}

// ------------------------------------------------------------------ sistema --

async function adminAnuncio(ctx, mensagem) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!mensagem || !mensagem.trim()) return ctx.send({ content: 'Escreva o texto do anúncio.' });
  await ctx.send({
    embeds: [new EmbedBuilder().setColor(0xffd166).setAuthor({ name: '📯 Anúncio' }).setDescription(mensagem.trim().slice(0, 3500))],
  });
}

async function adminStats(ctx) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  const todos = Object.values(loadAll());
  const totalJogadores = todos.length;
  const totalCarteira = todos.reduce((s, p) => s + (p.moedas || 0), 0);
  const totalBanco = todos.reduce((s, p) => s + (p.banco?.saldo || 0), 0);
  const totalCartas = todos.reduce((s, p) => s + (p.colecao?.length || 0), 0);
  const cidadesFundadas = todos.filter(p => p.cidade?.fundada).length;
  const totalMoradoresConvidados = todos.reduce((s, p) => s + Object.values(p.npcs || {}).filter(e => e?.convidado).length, 0);

  const linhas = [
    `👤 Jogadores registrados: **${totalJogadores}**`,
    `🪙 Moedas em circulação: **${totalCarteira + totalBanco}** (${totalCarteira} em carteiras, ${totalBanco} em bancos)`,
    `🃏 Cartas distribuídas: **${totalCartas}**`,
    `🏰 Cidades fundadas: **${cidadesFundadas}**`,
    `🏘️ Moradores convidados no total: **${totalMoradoresConvidados}**`,
  ];
  await ctx.send({ embeds: [embedAdmin('Estatísticas do bot', linhas.join('\n'))] });
}

module.exports = {
  adminMoedas,
  adminBanco,
  adminCarta,
  adminRemoverCarta,
  adminArmadura,
  adminPerk,
  adminFragmentos,
  adminResetarJogador,
  adminPerfilDebug,
  adminCidadeRecursos,
  adminSaqueRecursos,
  adminCidadeResetar,
  adminNpcConvidar,
  adminNpcResetarMemoria,
  adminNpcPersonalidade,
  adminNpcLiberar,
  adminRoubarLimpar,
  adminAnuncio,
  adminStats,
};
