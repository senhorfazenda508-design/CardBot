// Moradores da vila com quem o jogador pode conversar.
// Cada um tem uma personalidade fixa que vira o system prompt da IA (via
// game/npcEngine.js). Quem tem `custoConvite` pode ser convidado pra viver
// na vila do jogador com /convidar e depois conversado com /morador.
//
// 'taverneiro' (Thomas, o taverneiro de verdade) e 'mago' (Aldric) NÃO ficam
// na lista de convidáveis: o Thomas já é global e sempre disponível via
// /taverneiro (game/ai.js), e o Aldric já tem seu próprio sistema
// determinístico (sem IA) ligado aos Fragmentos Arcanos via /mago
// (core/mago.js). Manter os dois de fora evita dois "cérebros" concorrentes
// pro mesmo personagem.
//
// A LISTA em si mora em data/npcs.json (não mais hardcoded aqui) pra poder
// ser editada pelo painel web (nome, emoji, jeito/persona, profissão,
// bordões, custo de convite) SEM precisar reiniciar o bot: o arquivo é lido
// do disco a cada chamada (é pequeno, o custo é irrelevante), então uma
// edição feita no site já vale na próxima mensagem do jogador.

const fs = require('fs');
const path = require('path');

const NPCS_PATH = path.join(__dirname, '..', 'data', 'npcs.json');

// Usado só se o arquivo data/npcs.json não existir por algum motivo (ex.
// primeira instalação antes de rodar o setup) — garante que o bot nunca
// fica sem NPC nenhum.
const NPCS_PADRAO = [
  { id: 'taverneiro', nome: 'Bartolomeu, o Taverneiro', emoji: '🍺', profissao: 'Taverneiro', bordoes: [], persona: 'Você é Bartolomeu, o taverneiro barrigudo e falante da vila. Adora contar causos exagerados sobre monstros da masmorra, sempre com bom humor e um pouco de fanfarronice. Trata o jogador com informalidade e carinho, como um cliente antigo.' },
  { id: 'mago', nome: 'Aldric, o Mago Arcano', emoji: '🔮', profissao: 'Mago Arcano', bordoes: [], persona: 'Você é Aldric, um mago arcano recluso que mora na torre nos limites da vila. Fala de forma solene e um pouco arrogante, tratando magia como uma ciência séria. Só demonstra interesse genuíno quando o assunto é Fragmentos Arcanos e o poder que eles escondem.' },
];

function garantirArquivo() {
  const dir = path.dirname(NPCS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(NPCS_PATH)) {
    fs.writeFileSync(NPCS_PATH, JSON.stringify(NPCS_PADRAO, null, 2));
  }
}

// Monta o `persona` (system prompt) final somando o "jeito" base com a
// profissão e os bordões cadastrados — sem precisar mexer no motor de IA
// (game/npcEngine.js) toda vez que alguém edita um NPC pelo site.
function montarPersonaCompleta(npc) {
  let texto = String(npc.persona || '').trim();
  if (npc.profissao) {
    texto += `\nSua profissão/papel na vila: ${npc.profissao}.`;
  }
  if (Array.isArray(npc.bordoes) && npc.bordoes.length) {
    texto += `\nVocê tem alguns bordões/frases de efeito que gosta de soltar de vez em quando, quando fizer sentido na conversa (não precisa forçar em toda mensagem): ${npc.bordoes.join(' | ')}`;
  }
  return texto;
}

function carregarNPCsCru() {
  garantirArquivo();
  try {
    const raw = JSON.parse(fs.readFileSync(NPCS_PATH, 'utf8') || '[]');
    return Array.isArray(raw) && raw.length ? raw : NPCS_PADRAO;
  } catch {
    return NPCS_PADRAO;
  }
}

// Lista completa de NPCs, já com o `persona` final calculado (base + profissão
// + bordões) pronto pra ser usado direto pelo motor de IA.
function getNPCS() {
  return carregarNPCsCru().map(n => ({ ...n, persona: montarPersonaCompleta(n) }));
}

// IDs que podem ser convidados via /convidar + conversados via /morador.
// (Thomas e Aldric ficam de fora por padrão — ver comentário no topo do
// arquivo — mas isso é decidido só por ter ou não `custoConvite` definido,
// então dá pra mudar isso pelo site também se algum dia fizer sentido.)
function idsConvidaveis() {
  return getNPCS().filter(n => n.custoConvite).map(n => n.id);
}

function npcAleatorio() {
  const lista = getNPCS();
  return lista[Math.floor(Math.random() * lista.length)];
}

function buscarNPC(idOuNome) {
  const alvo = String(idOuNome || '').trim().toLowerCase();
  if (!alvo) return null;
  const lista = getNPCS();
  return (
    lista.find(n => n.id === alvo) ||
    lista.find(n => n.nome.toLowerCase() === alvo) ||
    lista.find(n => n.nome.toLowerCase().includes(alvo)) ||
    null
  );
}

function npcsConvidaveis() {
  const ids = idsConvidaveis();
  return getNPCS().filter(n => ids.includes(n.id));
}

module.exports = {
  getNPCS,
  idsConvidaveis,
  npcAleatorio,
  buscarNPC,
  npcsConvidaveis,
  // Compat: algumas partes antigas do código esperavam essas duas como
  // valores estáticos. Continuam funcionando, mas representam só o estado
  // no momento em que o módulo foi carregado (require) — pra pegar sempre o
  // valor mais atual (ex: depois de editar pelo site), prefira getNPCS()/
  // idsConvidaveis() nos códigos novos.
  get NPCS() { return getNPCS(); },
  get IDS_CONVIDAVEIS() { return idsConvidaveis(); },
};
