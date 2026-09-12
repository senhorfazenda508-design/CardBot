const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'players.json');

// ---------------------------------------------------------------------------
// Antes, loadAll()/saveAll() liam e escreviam o arquivo INTEIRO de forma
// SÍNCRONA a cada getPlayer/savePlayer (ou seja, em quase toda ação do jogo).
// Com o players.json crescendo (mais jogadores = arquivo maior), isso passa
// a bloquear a thread principal do Node por tempo suficiente pra estourar a
// janela de ~3s que o Discord dá pra confirmar uma interação — e é isso que
// causa erros como "Unknown interaction" (DiscordAPIError 10062) em
// deferReply()/update(), mesmo em comandos que não têm nada de errado.
//
// Agora os dados ficam em cache em memória (lidos do disco só na primeira
// vez) e a escrita em disco é ASSÍNCRONA e "debounced": várias chamadas de
// savePlayer em sequência (comum, ex. dentro de uma batalha) viram uma única
// escrita, um pouco depois, sem travar o event loop.
let cache = null;
let escritaAgendada = null;
let escritaPendente = false;

function carregarDoDisco() {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function loadAll() {
  if (!cache) cache = carregarDoDisco();
  return cache;
}

function agendarEscrita() {
  escritaPendente = true;
  if (escritaAgendada) return;
  escritaAgendada = setTimeout(() => {
    escritaAgendada = null;
    if (!escritaPendente || !cache) return;
    escritaPendente = false;
    const dados = JSON.stringify(cache, null, 2);
    fs.writeFile(DB_PATH, dados, err => {
      if (err) console.error('Erro ao salvar players.json:', err);
    });
  }, 250);
  // Não deixa esse timer sozinho impedir o processo de encerrar (ex: Ctrl+C).
  if (escritaAgendada.unref) escritaAgendada.unref();
}

// Força gravar em disco AGORA, de forma síncrona — usado só ao encerrar o
// processo (ver index.js), pra não perder a última escrita "debounced".
function flushSync() {
  if (escritaAgendada) {
    clearTimeout(escritaAgendada);
    escritaAgendada = null;
  }
  if (escritaPendente && cache) {
    escritaPendente = false;
    fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2));
  }
}

function saveAll(data) {
  cache = data;
  agendarEscrita();
}

function cidadePadrao() {
  return {
    fundada: false,
    nome: null,
    grid: Array(25).fill(null), // 25 lotes (5x5); cada um null ou o id do edifício
    recursos: { madeira: 60, pedra: 40, comida: 30, ouro: 0 },
    ultimaColeta: Date.now(),
  };
}

function defaultPlayer(username) {
  return {
    username,
    moedas: 100,
    criadoEm: Date.now(),
    ultimoDiario: 0,
    streakDiario: 0,
    colecao: ['comum_espada', 'comum_espada', 'comum_escudo', 'comum_adaga', 'comum_cura'],
    armaduras: [],
    perks: [],
    equipamento: { armadura: null, perkPassiva: null, perkAtiva: null },
    encantamentos: {}, // { idDaCarta: nivel }
    run: {
      ativa: false,
      andar: 0,
      hp: 0,
      hpMax: 0,
      escudo: 0,
      moedasRun: 0
    },
    estatisticas: {
      vitorias: 0,
      derrotas: 0,
      maiorAndar: 0
    },
    cidade: cidadePadrao(),
    taverneiro: {
      historico: [], moedasHoje: 0, diaMoedas: null, ultimaMsg: 0, desconto: 0, descontoExpira: 0,
      visitas: 0, totalGorjetas: 0, clienteDesde: null,
      humor: 'neutro', humorDesde: null, avisos: 0, vezesExpulso: 0, deMalAte: 0,
    },
    banco: { saldo: 0, ultimoJuros: Date.now() },
    fragmentosArcanos: 0,
    encantamentosArcanos: {}, // { idDaCarta: true } — selo do Mago Aldric
    narrador: { historico: [] }, // memória persistente do /ia (Narrador) — antes ficava só em RAM
    npcs: {}, // moradores convidados pra vila: { [npcId]: { convidado, historico, moedasHoje, ... } }
    roubo: { ultimoRoubo: 0, protegidoAte: 0 }, // cooldown de quem tenta roubar + proteção de quem acabou de ser roubado
  };
}

// Preenche campos novos em jogadores salvos antes dessas features existirem,
// pra ninguém quebrar o save por causa do upgrade do bot.
function migrarPlayer(p) {
  if (!p.armaduras) p.armaduras = [];
  if (!p.perks) p.perks = [];
  if (!p.equipamento) p.equipamento = { armadura: null, perkPassiva: null, perkAtiva: null };
  if (p.equipamento.perkPassiva === undefined) p.equipamento.perkPassiva = null;
  if (p.equipamento.perkAtiva === undefined) p.equipamento.perkAtiva = null;
  if (!p.encantamentos) p.encantamentos = {};
  if (!p.cidade) p.cidade = cidadePadrao();
  if (!p.cidade.recursos) p.cidade.recursos = { madeira: 60, pedra: 40, comida: 30, ouro: 0 };
  if (!Array.isArray(p.cidade.grid) || p.cidade.grid.length !== 25) p.cidade.grid = Array(25).fill(null);
  if (!p.cidade.ultimaColeta) p.cidade.ultimaColeta = Date.now();
  if (!p.taverneiro) p.taverneiro = { historico: [], moedasHoje: 0, diaMoedas: null, ultimaMsg: 0, desconto: 0, descontoExpira: 0 };
  if (p.taverneiro.visitas === undefined) p.taverneiro.visitas = 0;
  if (p.taverneiro.totalGorjetas === undefined) p.taverneiro.totalGorjetas = 0;
  if (p.taverneiro.clienteDesde === undefined) p.taverneiro.clienteDesde = null;
  if (!p.taverneiro.humor) p.taverneiro.humor = 'neutro';
  if (p.taverneiro.humorDesde === undefined) p.taverneiro.humorDesde = null;
  if (p.taverneiro.avisos === undefined) p.taverneiro.avisos = 0;
  if (p.taverneiro.vezesExpulso === undefined) p.taverneiro.vezesExpulso = 0;
  if (p.taverneiro.deMalAte === undefined) p.taverneiro.deMalAte = 0;
  if (!p.banco) p.banco = { saldo: 0, ultimoJuros: Date.now() };
  if (p.banco.saldo === undefined) p.banco.saldo = 0;
  if (!p.banco.ultimoJuros) p.banco.ultimoJuros = Date.now();
  if (p.fragmentosArcanos === undefined) p.fragmentosArcanos = 0;
  if (!p.encantamentosArcanos) p.encantamentosArcanos = {};
  if (!p.narrador) p.narrador = { historico: [] };
  if (!Array.isArray(p.narrador.historico)) p.narrador.historico = [];
  if (!p.npcs) p.npcs = {};
  if (!p.roubo) p.roubo = { ultimoRoubo: 0, protegidoAte: 0 };
  if (p.roubo.ultimoRoubo === undefined) p.roubo.ultimoRoubo = 0;
  if (p.roubo.protegidoAte === undefined) p.roubo.protegidoAte = 0;
  return p;
}

function getPlayer(id, username) {
  const all = loadAll();
  if (!all[id]) {
    all[id] = defaultPlayer(username);
    saveAll(all);
  }
  all[id] = migrarPlayer(all[id]);
  if (username) all[id].username = username;
  return all[id];
}

function savePlayer(id, playerData) {
  const all = loadAll();
  all[id] = playerData;
  saveAll(all);
}

module.exports = { getPlayer, savePlayer, loadAll, saveAll, defaultPlayer, cidadePadrao, migrarPlayer, flushSync };
