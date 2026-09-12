// Persistência de quais canais têm o "Chat Livre da IA" ativado — o bot com
// personalidade PRÓPRIA (não um NPC do RPG) conversando ao vivo, sem precisar
// de comando. A lógica de conversa em si fica em game/chatBotIA.js; este
// arquivo só guarda em disco, por servidor, a lista de canais ligados.
//
// Formato do arquivo (data/chatia.json): { "<guildId>": ["<channelId>", ...] }
//
// É um arquivo pequeno, alterado raramente (só quando um admin liga/pausa um
// canal), então ler e escrever de forma síncrona não pesa — sem necessidade
// do cache+debounce que o db.js usa pra players.json (que é escrito toda
// hora, em quase toda ação do jogo).

const fs = require('fs');
const path = require('path');

const CHATIA_PATH = path.join(__dirname, '..', 'data', 'chatia.json');

function ler() {
  try {
    if (!fs.existsSync(CHATIA_PATH)) return {};
    return JSON.parse(fs.readFileSync(CHATIA_PATH, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function salvar(dados) {
  try {
    const dir = path.dirname(CHATIA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CHATIA_PATH, JSON.stringify(dados, null, 2));
  } catch (err) {
    console.error('Erro ao salvar data/chatia.json:', err);
  }
}

function canaisAtivos(guildId) {
  if (!guildId) return [];
  const dados = ler();
  return Array.isArray(dados[guildId]) ? dados[guildId] : [];
}

function estaAtivo(guildId, channelId) {
  return canaisAtivos(guildId).includes(channelId);
}

// Retorna true se acabou de ativar agora (false se já estava ativo antes).
function ativar(guildId, channelId) {
  const dados = ler();
  const lista = new Set(Array.isArray(dados[guildId]) ? dados[guildId] : []);
  const jaEstava = lista.has(channelId);
  lista.add(channelId);
  dados[guildId] = Array.from(lista);
  salvar(dados);
  return !jaEstava;
}

// Retorna true se estava ativo e foi pausado agora (false se já estava desligado).
function pausar(guildId, channelId) {
  const dados = ler();
  const lista = new Set(Array.isArray(dados[guildId]) ? dados[guildId] : []);
  const estava = lista.has(channelId);
  lista.delete(channelId);
  dados[guildId] = Array.from(lista);
  salvar(dados);
  return estava;
}

// Pausa em TODOS os canais do servidor de uma vez — retorna quantos estavam ativos.
function pausarTudo(guildId) {
  const dados = ler();
  const quantos = Array.isArray(dados[guildId]) ? dados[guildId].length : 0;
  dados[guildId] = [];
  salvar(dados);
  return quantos;
}

module.exports = { canaisAtivos, estaAtivo, ativar, pausar, pausarTudo };
