// Guarda, por servidor (guildId), um "tempero" de personalidade extra que
// é somado ao prompt de sistema fixo do /ia. Nunca substitui as regras de
// segurança do bot — só adiciona um tom/estilo por cima.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'ia_config.json');
const MAX_TAMANHO = 300;

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

function getPersona(guildId) {
  if (!guildId) return null;
  const all = loadAll();
  return all[guildId]?.persona || null;
}

function setPersona(guildId, texto) {
  const all = loadAll();
  const limpo = String(texto).trim().slice(0, MAX_TAMANHO);
  all[guildId] = { persona: limpo, atualizadoEm: Date.now() };
  saveAll(all);
  return limpo;
}

function resetPersona(guildId) {
  const all = loadAll();
  delete all[guildId];
  saveAll(all);
}

module.exports = { getPersona, setPersona, resetPersona, MAX_TAMANHO };
