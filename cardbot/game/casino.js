// Jogos de apostas do Cassino Medieval — só a matemática/sorteio, sem discord.js aqui.

// ---------- Jogo de Hazard (dados medievais, ancestral do craps) ----------
// Rola 2 dados de 6 faces:
//  - Dobradinha (par igual)          -> paga 2x   (6/36 ≈ 16,7%)
//  - Soma 9, 10, 11 ou 12 sem par    -> paga 1.5x  (8/36 ≈ 22,2%)
//  - Soma 7 ou 8 sem par             -> paga 1x (empate, devolve a aposta) (10/36 ≈ 27,8%)
//  - Qualquer outra soma             -> perde a aposta (12/36 ≈ 33,3%)
function jogarDados() {
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  const soma = d1 + d2;
  const dobradinha = d1 === d2;

  let multiplicador = 0;
  let categoria = 'Nada feito';
  if (dobradinha) {
    multiplicador = 2;
    categoria = `Dobradinha de ${d1}!`;
  } else if (soma >= 9) {
    multiplicador = 1.5;
    categoria = `Soma alta (${soma})!`;
  } else if (soma >= 7) {
    multiplicador = 1;
    categoria = `Empate (${soma}) — aposta devolvida`;
  } else {
    categoria = `Soma baixa (${soma})`;
  }

  return { d1, d2, soma, dobradinha, multiplicador, categoria };
}

// ---------- Roda da Fortuna ----------
// Roleta de madeira com 8 gomos de valores diferentes, pesados pra dar uma leve
// vantagem à casa (a soma dos pesos x multiplicadores fica um pouco abaixo de 1).
const GOMOS_RODA = [
  { multiplicador: 0, peso: 30, label: '💀 Ruína' },
  { multiplicador: 0.5, peso: 22, label: '🥀 Meia perda' },
  { multiplicador: 1, peso: 16, label: '🔁 Empate' },
  { multiplicador: 1.5, peso: 15, label: '🍀 Sorte' },
  { multiplicador: 2, peso: 10, label: '⚜️ Favor real' },
  { multiplicador: 3, peso: 5, label: '👑 Bênção do rei' },
  { multiplicador: 5, peso: 1.5, label: '🏰 Tesouro do castelo' },
  { multiplicador: 10, peso: 0.5, label: '🐉 Tesouro do dragão' },
];

function girarRoda() {
  const total = GOMOS_RODA.reduce((s, g) => s + g.peso, 0);
  let roll = Math.random() * total;
  for (const gomo of GOMOS_RODA) {
    if (roll < gomo.peso) return gomo;
    roll -= gomo.peso;
  }
  return GOMOS_RODA[0];
}

// ---------- Cara ou Coroa do Rei ----------
// Aposta simples: acerte o lado da moeda e ganha 1.9x (leve vantagem da casa).
function jogarMoeda(escolha) {
  const resultado = Math.random() < 0.5 ? 'cara' : 'coroa';
  const acertou = resultado === escolha;
  return { resultado, acertou, multiplicador: acertou ? 1.9 : 0 };
}

module.exports = {
  jogarDados,
  girarRoda,
  jogarMoeda,
  GOMOS_RODA,
};
