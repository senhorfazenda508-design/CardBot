// Catálogo de cartas do jogo.
// effect: 'nenhum' | 'cura' | 'roubo' | 'critico' | 'escudo'
// tipo: define o desenho do ícone central do "emoji" da carta (ver game/gui.js)
// REGRA: cartas com ataque >= 7 sempre devem ter um efeito além de 'nenhum'
// (crítico, roubo/vampirismo ou escudo) — dano alto sozinho fica sem graça.
//
// O catálogo mora em data/cards.json (editável pelo painel web — nome,
// emoji, raridade, ataque, efeito, valor, tipo). É lido uma vez quando o bot
// sobe; uma edição feita pelo site vale a partir do próximo restart (a
// coleção dos jogadores só guarda o ID da carta, então reiniciar é seguro).
const fs = require('fs');
const path = require('path');

const CARDS_PATH = path.join(__dirname, '..', 'data', 'cards.json');
const CARDS_PADRAO = {
  comum_espada: { id: 'comum_espada', nome: 'Espada Enferrujada', raridade: 'Comum', ataque: 6, efeito: 'nenhum', tipo: 'espada', emoji: '🗡️' },
};

const RARIDADE_ORDEM = ['Ancestral', 'Mítico', 'Lendário', 'Épico', 'Raro', 'Incomum', 'Comum'];

// Rede de segurança: se alguma carta em data/cards.json vier com raridade
// vazia, ausente, ou com um texto que não bate com nenhuma das 7 raridades
// de RARIDADE_ORDEM (ex: edição manual do arquivo, capitalização errada,
// ou um bug antigo do painel que gravava raridade em branco), ela NUNCA
// deve sumir silenciosamente do /raridades — em vez disso, corrigimos pra
// 'Comum' aqui na carga e avisamos no console pra alguém checar o cadastro.
function normalizarRaridades(dados) {
  for (const carta of Object.values(dados)) {
    if (!RARIDADE_ORDEM.includes(carta.raridade)) {
      console.warn(`[cards] Carta "${carta.id || carta.nome}" tinha raridade inválida (${JSON.stringify(carta.raridade)}) — corrigida para 'Comum'. Confira/edite pelo painel web.`);
      carta.raridade = 'Comum';
    }
  }
  return dados;
}

function carregarCards() {
  try {
    if (!fs.existsSync(CARDS_PATH)) {
      fs.writeFileSync(CARDS_PATH, JSON.stringify(CARDS_PADRAO, null, 2));
    }
    const dados = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8') || '{}');
    return normalizarRaridades(dados && Object.keys(dados).length ? dados : CARDS_PADRAO);
  } catch {
    return CARDS_PADRAO;
  }
}

const CARDS = carregarCards();

const RARIDADE_COR = {
  Comum: 0x9e9e9e,
  Incomum: 0x4caf50,
  Raro: 0x2196f3,
  Épico: 0x9c27b0,
  Lendário: 0xffb300,
  Mítico: 0x00e5c7,
  Ancestral: 0xff3860,
};

const RARIDADE_PESO = {
  Comum: 45,
  Incomum: 27,
  Raro: 16,
  Épico: 8,
  Lendário: 3,
  Mítico: 0.8,
  Ancestral: 0.2,
};

function cartasPorRaridade(raridade) {
  return Object.values(CARDS).filter(c => c.raridade === raridade);
}

function sortearRaridade(pesos = RARIDADE_PESO) {
  const entradas = Object.entries(pesos);
  const total = entradas.reduce((s, [, p]) => s + p, 0);
  let roll = Math.random() * total;
  for (const [rar, peso] of entradas) {
    if (roll < peso) return rar;
    roll -= peso;
  }
  return entradas[0][0];
}

function sortearCarta(pesos) {
  const raridade = sortearRaridade(pesos);
  const pool = cartasPorRaridade(raridade);
  return pool[Math.floor(Math.random() * pool.length)];
}

function buscarCartasPorNome(termo) {
  const alvo = termo.trim().toLowerCase();
  if (!alvo) return [];
  const exatas = Object.values(CARDS).filter(c => c.nome.toLowerCase() === alvo);
  if (exatas.length > 0) return exatas;
  return Object.values(CARDS).filter(c => c.nome.toLowerCase().includes(alvo));
}

module.exports = {
  CARDS,
  RARIDADE_COR,
  RARIDADE_PESO,
  RARIDADE_ORDEM,
  cartasPorRaridade,
  sortearCarta,
  sortearRaridade,
  buscarCartasPorNome,
};
