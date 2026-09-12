// Catálogo de armaduras — equipamento persistente (diferente das cartas, que são
// sorteadas em pacotes). Uma armadura equipada reduz % do dano recebido em
// batalha e aumenta a vida máxima da run/duelo.
//
// O catálogo mora em data/armaduras.json (editável pelo painel web). Lido
// uma vez quando o bot sobe; uma edição pelo site vale no próximo restart.
const fs = require('fs');
const path = require('path');

const ARMADURAS_PATH = path.join(__dirname, '..', 'data', 'armaduras.json');
const ARMADURAS_PADRAO = {
  couro: { id: 'couro', nome: 'Armadura de Couro', raridade: 'Comum', defesa: 0.05, vida: 6, preco: 90, emoji: '🥋' },
};

function carregarArmaduras() {
  try {
    if (!fs.existsSync(ARMADURAS_PATH)) {
      fs.writeFileSync(ARMADURAS_PATH, JSON.stringify(ARMADURAS_PADRAO, null, 2));
    }
    const dados = JSON.parse(fs.readFileSync(ARMADURAS_PATH, 'utf8') || '{}');
    return dados && Object.keys(dados).length ? dados : ARMADURAS_PADRAO;
  } catch {
    return ARMADURAS_PADRAO;
  }
}

const ARMADURAS = carregarArmaduras();

const RARIDADE_COR_HEX = {
  Comum: 0x9e9e9e,
  Incomum: 0x4caf50,
  Raro: 0x2196f3,
  'Épico': 0x9c27b0,
  'Lendário': 0xffb300,
  'Mítico': 0x00e5c7,
  'Ancestral': 0xff3860,
};

function listaArmaduras() {
  return Object.values(ARMADURAS);
}

function buscarArmaduraPorNome(termo) {
  const alvo = (termo || '').trim().toLowerCase();
  if (!alvo) return [];
  const exatas = listaArmaduras().filter(a => a.nome.toLowerCase() === alvo);
  if (exatas.length > 0) return exatas;
  return listaArmaduras().filter(a => a.nome.toLowerCase().includes(alvo));
}

// Retorna { defesa, vida } do que está equipado (0 se nada equipado)
function bonusEquipamento(player) {
  const id = player?.equipamento?.armadura;
  const armadura = id ? ARMADURAS[id] : null;
  return {
    defesa: armadura ? armadura.defesa : 0,
    vida: armadura ? armadura.vida : 0,
    armadura,
  };
}

module.exports = { ARMADURAS, listaArmaduras, buscarArmaduraPorNome, bonusEquipamento, RARIDADE_COR_HEX };
