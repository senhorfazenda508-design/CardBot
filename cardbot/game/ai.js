// Cérebro do Thomas, o taverneiro (NPC com IA via Groq).
//
// Desde a expansão de moradores da vila, essa lógica virou um wrapper fino
// em cima do motor genérico game/npcEngine.js (o mesmo usado por qualquer
// morador convidado via /convidar + /morador). O Thomas continua com seus
// limites originais (mais generosos, já balanceados) e com seu recurso
// exclusivo de comentar sobre outro jogador (contextoAlvo).
//
// Todas as funções exportadas aqui mantêm a MESMA assinatura de antes, então
// core/taverneiro.js, core/loja.js e core/clientes.js continuam funcionando
// sem nenhuma alteração.

const { interagirComNPC, garantirEstadoNPC, tierCliente: tierClienteBase, estadoPadraoNPC } = require('./npcEngine');

const THOMAS = {
  id: 'taverneiro',
  nome: 'Thomas',
  persona:
    'Você é Thomas, o taverneiro de um reino medieval de fantasia, dentro de um bot de Discord de RPG por cartas. ' +
    'Adora contar causos exagerados sobre monstros da masmorra, sempre com bom humor e um pouco de fanfarronice. ' +
    'Trata o jogador com informalidade e carinho, como um cliente antigo. Você administra a taverna e o mercado da vila.',
};

// Limites originais do Thomas — mais altos que os dos moradores comuns
// porque ele é o "chefe" da economia social do bot desde sempre.
const LIMITES_THOMAS = {
  cooldownMs: 8_000,
  maxMoedasPorMsg: 40,
  maxMoedasPorDia: 150,
  maxDescontoPct: 25,
  descontoDuracaoMs: 10 * 60 * 1000,
  historicoMax: 12,
};

function estadoPadraoTaverneiro() {
  return estadoPadraoNPC();
}

// Garante que o objeto do jogador tem o campo `taverneiro` e mantém o estado em dia.
function garantirEstado(player) {
  if (!player.taverneiro) player.taverneiro = estadoPadraoTaverneiro();
  return garantirEstadoNPC(player.taverneiro);
}

function tierCliente(taverneiro) {
  return tierClienteBase(taverneiro);
}

// contextoAlvo (opcional): { username, tier, visitas } de OUTRO jogador que o
// usuário mencionou na conversa, pra Thomas poder comentar sobre ele —
// é assim que o taverneiro serve de ponte social entre jogadores.
// guildId (opcional): usado só pra buscar ajuste de personalidade/época definido por admin.
async function falarComTaverneiro(player, mensagemUsuario, contextoAlvo = null, guildId = null) {
  const estado = garantirEstado(player);
  return interagirComNPC({ npc: THOMAS, estado, player, mensagemUsuario, contextoAlvo, limites: LIMITES_THOMAS, guildId });
}

// Reúne TODAS as fontes de desconto possíveis do jogador: o Thomas e
// qualquer morador convidado que também tenha oferecido um desconto ativo.
// Isso é o que permite os novos moradores darem desconto "igual ao Thomas"
// sem quebrar a loja, que sempre aplica o MELHOR desconto disponível.
function todasFontesDesconto(player) {
  const fontes = [];
  if (player.taverneiro) fontes.push(player.taverneiro);
  if (player.npcs) {
    for (const estado of Object.values(player.npcs)) fontes.push(estado);
  }
  return fontes;
}

// Usado pela loja pra saber se tem desconto ativo (do Thomas OU de qualquer
// morador convidado) e aplicá-lo — sempre o maior disponível no momento.
function descontoAtivo(player) {
  let melhor = 0;
  for (const estado of todasFontesDesconto(player)) {
    if (estado.desconto > 0 && estado.descontoExpira > Date.now() && estado.desconto > melhor) {
      melhor = estado.desconto;
    }
  }
  return melhor;
}

// Consome o desconto (uso único, chamado depois de uma compra bem-sucedida) —
// zera em todas as fontes, já que só um desconto é mostrado/aplicado por vez.
function consumirDesconto(player) {
  for (const estado of todasFontesDesconto(player)) {
    estado.desconto = 0;
    estado.descontoExpira = 0;
  }
}

module.exports = {
  falarComTaverneiro,
  descontoAtivo,
  consumirDesconto,
  garantirEstado,
  tierCliente,
  MAX_DESCONTO_PCT: LIMITES_THOMAS.maxDescontoPct,
  MAX_MOEDAS_POR_DIA: LIMITES_THOMAS.maxMoedasPorDia,
};
