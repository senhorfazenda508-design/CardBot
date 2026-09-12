// Sistema de colonização de cidade: um grid de 5x5 (25 lotes) onde o jogador
// constrói edifícios que produzem recursos com o tempo. O objetivo é fazer a
// cidade crescer (mais pontos = "cidade maior") no ranking global.

const fs = require('fs');
const path = require('path');

const TAMANHO_GRID = 5;
const TOTAL_LOTES = TAMANHO_GRID * TAMANHO_GRID;
const LOTE_CASTELO = 12; // centro do grid 5x5 — onde a cidade é fundada

// Os edifícios moram em data/edificios.json (editável pelo painel web —
// nome, emoji, custo, pontos, produção por hora, cor). São lidos uma vez
// quando o bot sobe; uma edição feita pelo site vale a partir do próximo
// restart do bot (o grid dos jogadores só guarda o ID do edifício, então é
// seguro reiniciar a qualquer momento sem perder nada).
const EDIFICIOS_PATH = path.join(__dirname, '..', 'data', 'edificios.json');
const EDIFICIOS_PADRAO = {
  castelo: { id: 'castelo', nome: 'Castelo', emoji: '🏰', custo: { madeira: 100, pedra: 100, moedas: 300 }, pontos: 12, producaoHora: {}, cor: '#c04af0' },
  casa: { id: 'casa', nome: 'Casa', emoji: '🏠', custo: { madeira: 25 }, pontos: 2, producaoHora: {}, cor: '#d9a066' },
};

function carregarEdificios() {
  try {
    if (!fs.existsSync(EDIFICIOS_PATH)) {
      fs.writeFileSync(EDIFICIOS_PATH, JSON.stringify(EDIFICIOS_PADRAO, null, 2));
    }
    const dados = JSON.parse(fs.readFileSync(EDIFICIOS_PATH, 'utf8') || '{}');
    if (!dados || !dados.castelo) return EDIFICIOS_PADRAO;
    // Auto-corrige emojis vazios/inválidos (ex: cadastrados antes dessa
    // validação existir, ou editados na mão) — evita o bot quebrar inteiro
    // ao montar o menu de construção (Discord rejeita COMPONENT_INVALID_EMOJI).
    for (const ed of Object.values(dados)) {
      const texto = String(ed.emoji || '').trim();
      if (!texto || [...texto].length > 4) ed.emoji = '🏗️';
    }
    return dados;
  } catch {
    return EDIFICIOS_PADRAO;
  }
}

const EDIFICIOS = carregarEdificios();

const RECURSOS_INFO = {
  madeira: { emoji: '🪵', nome: 'Madeira' },
  pedra: { emoji: '🪨', nome: 'Pedra' },
  comida: { emoji: '🌾', nome: 'Comida' },
  ouro: { emoji: '💰', nome: 'Ouro' },
  moedas: { emoji: '🪙', nome: 'Moedas' },
};

const HORAS_MAX_ACUMULO = 12; // produção para de acumular depois de 12h sem coletar

// ---------------------------------------------------------------------------
// Saque de recursos na masmorra: forma alternativa de ganhar madeira/pedra/
// comida/ouro SEM precisar fundar uma cidade. Todo jogador já tem um objeto
// `cidade.recursos` mesmo antes de fundar (ver db.js -> cidadePadrao), então
// esses recursos ficam guardados esperando o dia em que ele decidir fundar.
const SAQUE_MASMORRA = {
  chance: 0.25, // chance de achar recursos ao vencer uma batalha na masmorra
  minPorTipo: 5,
  maxPorTipo: 20,
};

// Sorteia um recurso + quantidade de "saque de masmorra". Ouro só entra no
// pool a partir do andar 4 (é o recurso mais valioso pra construção).
function sortearRecursoMasmorra(andar = 1) {
  const tipos = ['madeira', 'pedra', 'comida', 'ouro'];
  const pool = andar >= 4 ? tipos : tipos.filter(t => t !== 'ouro');
  const recurso = pool[Math.floor(Math.random() * pool.length)];
  const base = SAQUE_MASMORRA.minPorTipo + Math.floor(Math.random() * (SAQUE_MASMORRA.maxPorTipo - SAQUE_MASMORRA.minPorTipo + 1));
  const bonusAndar = Math.floor(andar / 2);
  const quantidade = recurso === 'ouro' ? Math.max(1, Math.ceil((base + bonusAndar) / 3)) : base + bonusAndar;
  return { recurso, quantidade };
}

function edificiosConstruiveis() {
  return Object.values(EDIFICIOS).filter(e => e.id !== 'castelo');
}

function podePagar(recursos, moedas, custo) {
  for (const [chave, valor] of Object.entries(custo)) {
    if (chave === 'moedas') {
      if (moedas < valor) return false;
    } else if ((recursos[chave] || 0) < valor) {
      return false;
    }
  }
  return true;
}

function primeiroLoteVazio(grid) {
  for (let i = 0; i < TOTAL_LOTES; i++) {
    if (i === LOTE_CASTELO) continue;
    if (!grid[i]) return i;
  }
  return -1;
}

// Calcula quanto cada recurso rendeu desde a última coleta, respeitando o teto de horas
function calcularProducaoPendente(cidade) {
  const agora = Date.now();
  const horasPassadas = Math.min(HORAS_MAX_ACUMULO, (agora - cidade.ultimaColeta) / (1000 * 60 * 60));
  const producao = { madeira: 0, pedra: 0, comida: 0, ouro: 0 };
  if (horasPassadas <= 0) return { producao, horas: 0 };

  for (const edificioId of cidade.grid) {
    if (!edificioId) continue;
    const ed = EDIFICIOS[edificioId];
    if (!ed) continue;
    for (const [recurso, porHora] of Object.entries(ed.producaoHora)) {
      producao[recurso] = (producao[recurso] || 0) + porHora * horasPassadas;
    }
  }

  for (const chave of Object.keys(producao)) {
    producao[chave] = Math.floor(producao[chave]);
  }

  return { producao, horas: horasPassadas };
}

function contarEdificios(grid) {
  const contagem = {};
  for (const id of grid) {
    if (!id) continue;
    contagem[id] = (contagem[id] || 0) + 1;
  }
  return contagem;
}

function calcularPontuacao(cidade) {
  if (!cidade.fundada) return 0;
  let pontos = 0;
  for (const id of cidade.grid) {
    if (!id) continue;
    const ed = EDIFICIOS[id];
    if (ed) pontos += ed.pontos;
  }
  return pontos;
}

function producaoTotalPorHora(cidade) {
  const total = { madeira: 0, pedra: 0, comida: 0, ouro: 0 };
  for (const id of cidade.grid) {
    if (!id) continue;
    const ed = EDIFICIOS[id];
    if (!ed) continue;
    for (const [recurso, porHora] of Object.entries(ed.producaoHora)) {
      total[recurso] = (total[recurso] || 0) + porHora;
    }
  }
  return total;
}

module.exports = {
  TAMANHO_GRID,
  TOTAL_LOTES,
  LOTE_CASTELO,
  EDIFICIOS,
  RECURSOS_INFO,
  edificiosConstruiveis,
  podePagar,
  primeiroLoteVazio,
  calcularProducaoPendente,
  contarEdificios,
  calcularPontuacao,
  producaoTotalPorHora,
  SAQUE_MASMORRA,
  sortearRecursoMasmorra,
};
