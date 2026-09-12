// Sistema de encantamento: consome cópias da própria carta + moedas para
// aumentar permanentemente o nível de encantamento daquele tipo de carta
// (todas as cópias que você tiver ou vier a ter daquele id se beneficiam).
const NIVEL_MAXIMO = 10;
const BONUS_POR_NIVEL = 0.08; // +8% de ataque/valor de efeito por nível

const CUSTO_MOEDAS_BASE = {
  Comum: 20,
  Incomum: 35,
  Raro: 60,
  'Épico': 120,
  'Lendário': 260,
  'Mítico': 550,
  'Ancestral': 1200,
};

// Quantas cópias da carta são consumidas para ir do nível atual pro próximo
function copiasNecessarias(nivelAtual) {
  return nivelAtual + 1;
}

function custoMoedas(carta, nivelAtual) {
  const base = CUSTO_MOEDAS_BASE[carta.raridade] || 20;
  return base * (nivelAtual + 1);
}

function nivelDe(player, cartaId) {
  return player.encantamentos?.[cartaId] || 0;
}

// Bônus fixo do Selo Arcano do Mago Aldric — exclusivo, obtido trocando um
// Fragmento Arcano (item raro da masmorra) por carta, empilha com o
// encantamento normal acima.
const BONUS_SELO_ARCANO = 0.25;

// Efeitos cujo "valor" é um LIMIAR de vida ou um CUSTO (não uma magnitude de
// efeito) — encantar a carta não deve mexer nesse número, só no ataque base.
const EFEITOS_VALOR_FIXO = new Set(['execucao', 'ultimo_suspiro', 'sacrificio']);

// Aplica o bônus de encantamento (e, opcionalmente, o Selo Arcano) a uma
// cópia "virtual" da carta, sem alterar o catálogo original.
function aplicarEncantamento(carta, nivel, seloArcano = false) {
  if (!nivel && !seloArcano) return carta;
  const mult = (1 + BONUS_POR_NIVEL * (nivel || 0)) * (seloArcano ? 1 + BONUS_SELO_ARCANO : 1);
  const encantada = { ...carta, ataque: Math.round(carta.ataque * mult) };
  if (carta.efeito !== 'nenhum' && typeof carta.valor === 'number' && EFEITOS_VALOR_FIXO.has(carta.efeito)) {
    encantada.valor = carta.valor; // limiar/custo original, intocado
  } else if (carta.efeito !== 'nenhum' && typeof carta.valor === 'number') {
    // efeitos percentuais (crítico, roubo) sobem mais devagar pra não ficarem quebrados
    const multEfeitoBase = carta.efeito === 'critico' || carta.efeito === 'roubo'
      ? 1 + (BONUS_POR_NIVEL * 0.5) * (nivel || 0)
      : mult;
    const multEfeito = multEfeitoBase * (seloArcano ? 1 + BONUS_SELO_ARCANO * 0.5 : 1);
    encantada.valor = carta.efeito === 'critico'
      ? Math.min(0.95, carta.valor * multEfeito)
      : Math.round(carta.valor * multEfeito * 10) / 10;
  }
  encantada.nivelEncantamento = nivel || 0;
  encantada.seloArcano = Boolean(seloArcano);
  return encantada;
}

module.exports = {
  NIVEL_MAXIMO,
  BONUS_POR_NIVEL,
  BONUS_SELO_ARCANO,
  copiasNecessarias,
  custoMoedas,
  nivelDe,
  aplicarEncantamento,
};
