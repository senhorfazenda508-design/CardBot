// Camada única de leitura/escrita de dados usada pelo painel web.
//
// Importante sobre concorrência: o painel roda num PROCESSO SEPARADO do bot
// (você inicia os dois com `npm start` e `npm run painel`). Arquivos como
// data/npcs.json, data/edificios.json e data/config.json são só lidos pelo
// bot a cada uso (sem cache em memória — ver game/npcs.js e lib/adminAuth.js),
// então o painel pode escrever neles com segurança e o bot pega a mudança na
// hora (NPCs/config) ou no próximo restart (edifícios da vila).
//
// data/players.json é DIFERENTE: o bot mantém ele em cache em memória e só
// grava no disco de forma "debounced" (ver db.js). Por isso o painel só LÊ
// esse arquivo (monitoramento/estatísticas) e nunca escreve nele — escrever
// por fora enquanto o bot roda poderia fazer o bot sobrescrever a mudança
// sem querer.

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const NPCS_PATH = path.join(DATA_DIR, 'npcs.json');
const EDIFICIOS_PATH = path.join(DATA_DIR, 'edificios.json');
const CARDS_PATH = path.join(DATA_DIR, 'cards.json');
const ARMADURAS_PATH = path.join(DATA_DIR, 'armaduras.json');
const PERKS_PATH = path.join(DATA_DIR, 'perks.json');
const PLAYERS_PATH = path.join(DATA_DIR, 'players.json');
const HEARTBEAT_PATH = path.join(DATA_DIR, 'heartbeat.json');

function lerJSON(caminho, padrao) {
  try {
    if (!fs.existsSync(caminho)) return padrao;
    const raw = fs.readFileSync(caminho, 'utf8');
    return JSON.parse(raw || 'null') ?? padrao;
  } catch {
    return padrao;
  }
}

// O Discord rejeita a interação INTEIRA se o emoji de um botão/menu vier
// vazio ou não for um emoji de verdade (ex: texto normal) — então validamos
// aqui antes de gravar, em vez de deixar isso estourar só na hora de usar
// o edifício/carta/armadura/perk no jogo.
function emojiValido(valor, padrao) {
  const texto = String(valor ?? '').trim();
  if (!texto || [...texto].length > 4) return padrao;
  return texto;
}

function escreverJSON(caminho, dados) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
}

// ------------------------------------------------------------------ config --
function getConfig() {
  const cfg = lerJSON(CONFIG_PATH, {});
  return {
    donoNome: cfg.donoNome || '',
    donoDiscordId: cfg.donoDiscordId || '',
    adminDiscordIds: Array.isArray(cfg.adminDiscordIds) ? cfg.adminDiscordIds : [],
    nomeVilaPadrao: cfg.nomeVilaPadrao || '',
    painelUsuarios: Array.isArray(cfg.painelUsuarios) ? cfg.painelUsuarios : [],
  };
}

function salvarConfig(cfg) {
  escreverJSON(CONFIG_PATH, cfg);
}

function atualizarConfigGeral({ donoNome, donoDiscordId, adminDiscordIds, nomeVilaPadrao }) {
  const cfg = getConfig();
  if (donoNome !== undefined) cfg.donoNome = String(donoNome).trim();
  if (donoDiscordId !== undefined) cfg.donoDiscordId = String(donoDiscordId).trim();
  if (nomeVilaPadrao !== undefined) cfg.nomeVilaPadrao = String(nomeVilaPadrao).trim();
  if (adminDiscordIds !== undefined) {
    cfg.adminDiscordIds = String(adminDiscordIds)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  salvarConfig(cfg);
  return cfg;
}

// ------------------------------------------------------------- usuários do painel --
function temAlgumUsuario() {
  return getConfig().painelUsuarios.length > 0;
}

function buscarUsuarioPorLogin(usuario) {
  const alvo = String(usuario || '').trim().toLowerCase();
  return getConfig().painelUsuarios.find(u => u.usuario.toLowerCase() === alvo) || null;
}

function buscarUsuarioPorId(id) {
  return getConfig().painelUsuarios.find(u => u.id === id) || null;
}

function criarUsuario({ usuario, senha, papel }) {
  const cfg = getConfig();
  if (buscarUsuarioPorLogin(usuario)) {
    throw new Error('Já existe um usuário do painel com esse nome.');
  }
  const novo = {
    id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    usuario: String(usuario).trim(),
    senhaHash: bcrypt.hashSync(String(senha), 10),
    papel: papel === 'dono' ? 'dono' : 'admin',
    criadoEm: Date.now(),
  };
  cfg.painelUsuarios.push(novo);
  salvarConfig(cfg);
  return novo;
}

function removerUsuario(id) {
  const cfg = getConfig();
  const restantes = cfg.painelUsuarios.filter(u => u.id !== id);
  cfg.painelUsuarios = restantes;
  salvarConfig(cfg);
}

function redefinirSenha(id, novaSenha) {
  const cfg = getConfig();
  const u = cfg.painelUsuarios.find(x => x.id === id);
  if (!u) throw new Error('Usuário não encontrado.');
  u.senhaHash = bcrypt.hashSync(String(novaSenha), 10);
  salvarConfig(cfg);
}

function conferirSenha(usuario, senha) {
  const u = buscarUsuarioPorLogin(usuario);
  if (!u) return null;
  if (!bcrypt.compareSync(String(senha), u.senhaHash)) return null;
  return u;
}

// ------------------------------------------------------------------- npcs --
function getNPCs() {
  return lerJSON(NPCS_PATH, []);
}

function salvarNPCs(lista) {
  escreverJSON(NPCS_PATH, lista);
}

function atualizarNPC(id, dados) {
  const lista = getNPCs();
  const idx = lista.findIndex(n => n.id === id);
  if (idx === -1) throw new Error('NPC não encontrado.');
  lista[idx] = {
    ...lista[idx],
    nome: dados.nome ?? lista[idx].nome,
    emoji: dados.emoji !== undefined ? emojiValido(dados.emoji, lista[idx].emoji) : lista[idx].emoji,
    profissao: dados.profissao ?? lista[idx].profissao,
    raridade: dados.raridade ?? lista[idx].raridade,
    persona: dados.persona ?? lista[idx].persona,
    bordoes: Array.isArray(dados.bordoes) ? dados.bordoes : lista[idx].bordoes,
    custoConvite: dados.custoConvite === '' || dados.custoConvite === null || dados.custoConvite === undefined
      ? lista[idx].custoConvite
      : Number(dados.custoConvite),
    fraseConvite: dados.fraseConvite ?? lista[idx].fraseConvite,
  };
  salvarNPCs(lista);
  return lista[idx];
}

function criarNPC(dados) {
  const lista = getNPCs();
  const id = String(dados.id || dados.nome || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!id) throw new Error('Nome/ID inválido.');
  if (lista.some(n => n.id === id)) throw new Error('Já existe um NPC com esse ID.');
  const novo = {
    id,
    nome: dados.nome || id,
    emoji: emojiValido(dados.emoji, '🧑'),
    profissao: dados.profissao || '',
    raridade: dados.raridade || 'Comum',
    persona: dados.persona || '',
    bordoes: Array.isArray(dados.bordoes) ? dados.bordoes : [],
  };
  if (dados.custoConvite) {
    novo.custoConvite = Number(dados.custoConvite);
    novo.fraseConvite = dados.fraseConvite || `${novo.nome} aceita se mudar pra sua vila.`;
  }
  lista.push(novo);
  salvarNPCs(lista);
  return novo;
}

function removerNPC(id) {
  const lista = getNPCs().filter(n => n.id !== id);
  salvarNPCs(lista);
}

// -------------------------------------------------------------- edifícios --
function getEdificios() {
  return lerJSON(EDIFICIOS_PATH, {});
}

function salvarEdificios(obj) {
  escreverJSON(EDIFICIOS_PATH, obj);
}

function atualizarEdificio(id, dados) {
  const obj = getEdificios();
  if (!obj[id]) throw new Error('Edifício não encontrado.');
  obj[id] = {
    ...obj[id],
    nome: dados.nome ?? obj[id].nome,
    emoji: dados.emoji !== undefined ? emojiValido(dados.emoji, obj[id].emoji) : obj[id].emoji,
    cor: dados.cor ?? obj[id].cor,
    pontos: dados.pontos !== undefined ? Number(dados.pontos) : obj[id].pontos,
    custo: dados.custo && typeof dados.custo === 'object' ? dados.custo : obj[id].custo,
    producaoHora: dados.producaoHora && typeof dados.producaoHora === 'object' ? dados.producaoHora : obj[id].producaoHora,
  };
  salvarEdificios(obj);
  return obj[id];
}

function criarEdificio(dados) {
  const obj = getEdificios();
  const id = String(dados.id || dados.nome || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!id || obj[id]) throw new Error('ID inválido ou já existente.');
  obj[id] = {
    id,
    nome: dados.nome || id,
    emoji: emojiValido(dados.emoji, '🏗️'),
    custo: dados.custo || {},
    pontos: Number(dados.pontos) || 1,
    producaoHora: dados.producaoHora || {},
    cor: dados.cor || '#999999',
  };
  salvarEdificios(obj);
  return obj[id];
}

function removerEdificio(id) {
  if (id === 'castelo') throw new Error('O Castelo não pode ser removido.');
  const obj = getEdificios();
  delete obj[id];
  salvarEdificios(obj);
}

const RARIDADES = ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico', 'Ancestral'];

function gerarId(base, jaExiste) {
  const id = String(base || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!id) throw new Error('Nome/ID inválido.');
  if (jaExiste(id)) throw new Error('Já existe um item com esse ID.');
  return id;
}

// ------------------------------------------------------------------- cartas --
function getCards() {
  return lerJSON(CARDS_PATH, {});
}

function salvarCards(obj) {
  escreverJSON(CARDS_PATH, obj);
}

// Valida uma raridade recebida do painel: só aceita se for uma das 7
// raridades conhecidas (RARIDADES, acima). Qualquer outra coisa (string
// vazia por causa de um <select> que perdeu o valor, texto digitado errado,
// etc.) é REJEITADA e cai no valor de fallback — nunca grava raridade
// inválida/vazia no arquivo. Isso é o que evita cartas "sumidas" do
// /raridades (uma raridade que não bate com nenhum botão do painel do bot).
function raridadeValida(valor, fallback) {
  return RARIDADES.includes(valor) ? valor : fallback;
}

function atualizarCarta(id, dados) {
  const obj = getCards();
  if (!obj[id]) throw new Error('Carta não encontrada.');
  obj[id] = {
    ...obj[id],
    nome: dados.nome ?? obj[id].nome,
    emoji: dados.emoji !== undefined ? emojiValido(dados.emoji, obj[id].emoji) : obj[id].emoji,
    raridade: dados.raridade !== undefined ? raridadeValida(dados.raridade, obj[id].raridade) : obj[id].raridade,
    ataque: dados.ataque !== undefined && dados.ataque !== '' ? Number(dados.ataque) : obj[id].ataque,
    efeito: dados.efeito ?? obj[id].efeito,
    valor: dados.valor !== undefined && dados.valor !== '' ? Number(dados.valor) : obj[id].valor,
    tipo: dados.tipo ?? obj[id].tipo,
  };
  salvarCards(obj);
  return obj[id];
}

function criarCarta(dados) {
  const obj = getCards();
  const id = gerarId(dados.id || dados.nome, i => Boolean(obj[i]));
  obj[id] = {
    id,
    nome: dados.nome || id,
    emoji: emojiValido(dados.emoji, '🗡️'),
    raridade: raridadeValida(dados.raridade, 'Comum'),
    ataque: Number(dados.ataque) || 1,
    efeito: dados.efeito || 'nenhum',
    tipo: dados.tipo || 'espada',
  };
  if (dados.valor !== undefined && dados.valor !== '') obj[id].valor = Number(dados.valor);
  salvarCards(obj);
  return obj[id];
}

function removerCarta(id) {
  const obj = getCards();
  delete obj[id];
  salvarCards(obj);
}

// --------------------------------------------------------------- armaduras --
function getArmaduras() {
  return lerJSON(ARMADURAS_PATH, {});
}

function salvarArmaduras(obj) {
  escreverJSON(ARMADURAS_PATH, obj);
}

function atualizarArmadura(id, dados) {
  const obj = getArmaduras();
  if (!obj[id]) throw new Error('Armadura não encontrada.');
  obj[id] = {
    ...obj[id],
    nome: dados.nome ?? obj[id].nome,
    emoji: dados.emoji !== undefined ? emojiValido(dados.emoji, obj[id].emoji) : obj[id].emoji,
    raridade: dados.raridade !== undefined ? raridadeValida(dados.raridade, obj[id].raridade) : obj[id].raridade,
    defesa: dados.defesa !== undefined && dados.defesa !== '' ? Number(dados.defesa) : obj[id].defesa,
    vida: dados.vida !== undefined && dados.vida !== '' ? Number(dados.vida) : obj[id].vida,
    preco: dados.preco !== undefined && dados.preco !== '' ? Number(dados.preco) : obj[id].preco,
  };
  salvarArmaduras(obj);
  return obj[id];
}

function criarArmadura(dados) {
  const obj = getArmaduras();
  const id = gerarId(dados.id || dados.nome, i => Boolean(obj[i]));
  obj[id] = {
    id,
    nome: dados.nome || id,
    emoji: emojiValido(dados.emoji, '🛡️'),
    raridade: raridadeValida(dados.raridade, 'Comum'),
    defesa: Number(dados.defesa) || 0,
    vida: Number(dados.vida) || 0,
    preco: Number(dados.preco) || 0,
  };
  salvarArmaduras(obj);
  return obj[id];
}

function removerArmadura(id) {
  const obj = getArmaduras();
  delete obj[id];
  salvarArmaduras(obj);
}

// -------------------------------------------------------------------- perks --
function getPerksCatalogo() {
  return lerJSON(PERKS_PATH, {});
}

function salvarPerks(obj) {
  escreverJSON(PERKS_PATH, obj);
}

// Perks têm campos de bônus bem variados por tipo (vidaBonus, danoMult,
// defesaBonus, regenPorTurno, vampiroPercent, critBonus, critBase,
// ultimoFolego, efeito+valor pras ativas) — em vez de um campo fixo pra cada
// possível bônus, o painel deixa editar isso como um JSON livre (`extra`),
// e aqui só validamos que é um objeto de verdade antes de gravar.
function atualizarPerk(id, dados) {
  const obj = getPerksCatalogo();
  if (!obj[id]) throw new Error('Perk não encontrada.');
  const extra = dados.extra && typeof dados.extra === 'object' ? dados.extra : {};
  obj[id] = {
    id,
    nome: dados.nome ?? obj[id].nome,
    emoji: dados.emoji !== undefined ? emojiValido(dados.emoji, obj[id].emoji) : obj[id].emoji,
    tipo: dados.tipo ?? obj[id].tipo,
    raridade: dados.raridade !== undefined ? raridadeValida(dados.raridade, obj[id].raridade) : obj[id].raridade,
    preco: dados.preco !== undefined && dados.preco !== '' ? Number(dados.preco) : obj[id].preco,
    descricao: dados.descricao ?? obj[id].descricao,
    ...extra,
  };
  salvarPerks(obj);
  return obj[id];
}

function criarPerk(dados) {
  const obj = getPerksCatalogo();
  const id = gerarId(dados.id || dados.nome, i => Boolean(obj[i]));
  const extra = dados.extra && typeof dados.extra === 'object' ? dados.extra : {};
  obj[id] = {
    id,
    nome: dados.nome || id,
    emoji: emojiValido(dados.emoji, '✨'),
    tipo: dados.tipo === 'ativa' ? 'ativa' : 'passiva',
    raridade: raridadeValida(dados.raridade, 'Comum'),
    preco: Number(dados.preco) || 0,
    descricao: dados.descricao || '',
    ...extra,
  };
  salvarPerks(obj);
  return obj[id];
}

function removerPerk(id) {
  const obj = getPerksCatalogo();
  delete obj[id];
  salvarPerks(obj);
}

// -------------------------------------------------------- jogadores (só leitura) --
function getJogadoresRaw() {
  return lerJSON(PLAYERS_PATH, {});
}

function estatisticasGerais() {
  const all = getJogadoresRaw();
  const ids = Object.keys(all);
  let moedasTotais = 0;
  let cidadesFundadas = 0;
  let vitoriasTotais = 0;
  let derrotasTotais = 0;
  const top = [];

  for (const id of ids) {
    const p = all[id] || {};
    const moedas = Number(p.moedas) || 0;
    moedasTotais += moedas;
    if (p.cidade?.fundada) cidadesFundadas++;
    vitoriasTotais += Number(p.estatisticas?.vitorias) || 0;
    derrotasTotais += Number(p.estatisticas?.derrotas) || 0;
    top.push({
      id,
      username: p.username || id,
      moedas,
      vitorias: Number(p.estatisticas?.vitorias) || 0,
      derrotas: Number(p.estatisticas?.derrotas) || 0,
      maiorAndar: Number(p.estatisticas?.maiorAndar) || 0,
      cidadeFundada: Boolean(p.cidade?.fundada),
      nomeCidade: p.cidade?.nome || null,
      npcsConvidados: p.npcs ? Object.values(p.npcs).filter(n => n?.convidado).length : 0,
    });
  }

  top.sort((a, b) => b.moedas - a.moedas);

  return {
    totalJogadores: ids.length,
    moedasTotais,
    cidadesFundadas,
    vitoriasTotais,
    derrotasTotais,
    jogadores: top,
  };
}

function getHeartbeat() {
  const hb = lerJSON(HEARTBEAT_PATH, null);
  if (!hb) return { online: false };
  const online = Date.now() - hb.ts < 45_000; // sem sinal há 45s+ = considerado offline
  return { ...hb, online };
}

module.exports = {
  getConfig,
  atualizarConfigGeral,
  temAlgumUsuario,
  buscarUsuarioPorLogin,
  buscarUsuarioPorId,
  criarUsuario,
  removerUsuario,
  redefinirSenha,
  conferirSenha,
  getNPCs,
  atualizarNPC,
  criarNPC,
  removerNPC,
  getEdificios,
  atualizarEdificio,
  criarEdificio,
  removerEdificio,
  RARIDADES,
  getCards,
  atualizarCarta,
  criarCarta,
  removerCarta,
  getArmaduras,
  atualizarArmadura,
  criarArmadura,
  removerArmadura,
  getPerksCatalogo,
  atualizarPerk,
  criarPerk,
  removerPerk,
  estatisticasGerais,
  getHeartbeat,
};
