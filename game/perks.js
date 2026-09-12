// Catálogo de perks — equipamento persistente extra (além de armadura), com
// um slot para perk PASSIVA (bônus sempre ativo) e um slot para perk ATIVA
// (habilidade que pode ser usada 1x por batalha/duelo, sem gastar cópias de carta).
//
// Perks passivas: aplicam bônus direto nas fórmulas de dano/vida/defesa/crítico
// em toda batalha e duelo, o tempo todo, sem precisar fazer nada.
//
// Perks ativas: aparecem como um botão extra ("✨ Usar perk") ao lado das
// cartas durante a batalha/duelo. Usar não gasta o turno (não conta como jogar
// uma carta) — só pode ser usada 1 vez por run/duelo.
//
// O catálogo mora em data/perks.json (editável pelo painel web). Lido uma
// vez quando o bot sobe; uma edição pelo site vale no próximo restart.
const fs = require('fs');
const path = require('path');

const PERKS_PATH = path.join(__dirname, '..', 'data', 'perks.json');
const PERKS_PADRAO = {
  vida_extra: {
    id: 'vida_extra', nome: 'Constituição Robusta', tipo: 'passiva', raridade: 'Comum',
    preco: 150, emoji: '❤️',
    descricao: '+15 de vida máxima em batalhas e duelos.',
    vidaBonus: 15,
  },
};

function carregarPerks() {
  try {
    if (!fs.existsSync(PERKS_PATH)) {
      fs.writeFileSync(PERKS_PATH, JSON.stringify(PERKS_PADRAO, null, 2));
    }
    const dados = JSON.parse(fs.readFileSync(PERKS_PATH, 'utf8') || '{}');
    return dados && Object.keys(dados).length ? dados : PERKS_PADRAO;
  } catch {
    return PERKS_PADRAO;
  }
}

const PERKS = carregarPerks();

const RARIDADE_COR_HEX = {
  Comum: 0x9e9e9e,
  Incomum: 0x4caf50,
  Raro: 0x2196f3,
  'Épico': 0x9c27b0,
  'Lendário': 0xffb300,
  'Mítico': 0x00e5c7,
  'Ancestral': 0xff3860,
};

function listaPerks() {
  return Object.values(PERKS);
}

function perksPorTipo(tipo) {
  return listaPerks().filter(p => p.tipo === tipo);
}

function buscarPerkPorNome(termo) {
  const alvo = (termo || '').trim().toLowerCase();
  if (!alvo) return [];
  const exatas = listaPerks().filter(p => p.nome.toLowerCase() === alvo);
  if (exatas.length > 0) return exatas;
  return listaPerks().filter(p => p.nome.toLowerCase().includes(alvo));
}

// Retorna o bônus consolidado da perk passiva equipada (objeto vazio se nenhuma).
function bonusPassivo(player) {
  const id = player?.equipamento?.perkPassiva;
  const perk = id ? PERKS[id] : null;
  if (!perk) return {};
  return {
    vidaBonus: perk.vidaBonus || 0,
    danoMult: perk.danoMult || 0,
    defesaBonus: perk.defesaBonus || 0,
    regenPorTurno: perk.regenPorTurno || 0,
    vampiroPercent: perk.vampiroPercent || 0,
    critBonus: perk.critBonus || 0,
    critBase: perk.critBase || 0,
    ultimoFolego: !!perk.ultimoFolego,
  };
}

// Retorna a perk ativa equipada (ou null).
function perkAtivaEquipada(player) {
  const id = player?.equipamento?.perkAtiva;
  return id ? PERKS[id] : null;
}

module.exports = {
  PERKS,
  RARIDADE_COR_HEX,
  listaPerks,
  perksPorTipo,
  buscarPerkPorNome,
  bonusPassivo,
  perkAtivaEquipada,
};
