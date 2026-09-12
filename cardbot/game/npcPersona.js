// Ajuste de personalidade/época definido por admins, por servidor + NPC.
//
// Ex: um admin pode pedir pra Isadora "parecer" alguém de 1920, ou deixar o
// Thomas mais rabugento só no servidor dele. Isso é um "tempero" somado ao
// prompt fixo de cada NPC (game/npcEngine.js) — NUNCA substitui as regras de
// segurança/limites do motor, só o tom/época/estilo de fala.
//
// Guardado por chave `${guildId}:${npcId}`, então cada servidor pode
// customizar cada morador (ou o Thomas, id "taverneiro") de forma independente.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'npc_persona.json');
const MAX_TEXTO = 300;
const MAX_EPOCA = 60;

function loadAll() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({}, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function saveAll(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

function chave(guildId, npcId) {
  return `${guildId}:${npcId}`;
}

// Retorna { texto, epoca, atualizadoEm } ou null se não houver nada configurado.
function obterPersonaExtra(guildId, npcId) {
  if (!guildId || !npcId) return null;
  const all = loadAll();
  return all[chave(guildId, npcId)] || null;
}

// texto/epoca: passe `undefined` pra não mexer no campo, ou string vazia/null
// pra limpar só aquele campo (mantendo o outro, se existir).
function definirPersonaExtra(guildId, npcId, { texto, epoca } = {}) {
  const all = loadAll();
  const k = chave(guildId, npcId);
  const atual = all[k] || { texto: null, epoca: null };

  const novo = {
    texto: texto !== undefined ? (texto ? String(texto).trim().slice(0, MAX_TEXTO) : null) : atual.texto,
    epoca: epoca !== undefined ? (epoca ? String(epoca).trim().slice(0, MAX_EPOCA) : null) : atual.epoca,
    atualizadoEm: Date.now(),
  };

  if (!novo.texto && !novo.epoca) {
    delete all[k];
  } else {
    all[k] = novo;
  }
  saveAll(all);
  return all[k] || null;
}

function resetarPersonaExtra(guildId, npcId) {
  const all = loadAll();
  delete all[chave(guildId, npcId)];
  saveAll(all);
}

module.exports = { obterPersonaExtra, definirPersonaExtra, resetarPersonaExtra, MAX_TEXTO, MAX_EPOCA };
