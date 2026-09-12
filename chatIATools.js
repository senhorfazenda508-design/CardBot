// Ferramentas (function calling) que o "cérebro" do Chat Livre da IA
// (game/chatBotIA.js, rodando no modelo da Groq) pode chamar durante uma
// conversa, além de só responder texto. Cada ferramenta é de baixo risco de
// propósito: nada aqui manda moedas, edita dados de OUTRA pessoa, nem
// executa código arbitrário — é sempre leitura (do próprio jogador que tá
// falando, ou de mensagens públicas do canal) ou geração de conteúdo
// (imagem).
//
// "Executar um comando do próprio bot" aqui significa: a IA consegue
// CONSULTAR os mesmos dados que os comandos /perfil, /saldo, /inventario e
// /raridades mostram, e comentar sobre isso na resposta dela — não significa
// que ela abre os embeds/botões interativos desses comandos (isso continua
// sendo função dos comandos de verdade).

const { getPlayer } = require('../db');
const { CARDS, RARIDADE_ORDEM, cartasPorRaridade } = require('./cards');
const { gerarImagem, ErroImagem } = require('../lib/imageGen');

const MAX_MENSAGENS_CANAL = 30;

// ------------------------------------------------------- especificações --
// Formato de function calling padrão OpenAI (Groq usa o mesmo formato).
function listaFerramentas() {
  return [
    {
      type: 'function',
      function: {
        name: 'gerar_imagem',
        description: 'Gera uma imagem a partir de uma descrição em texto e a envia no chat. Use quando alguém pedir um desenho, arte, meme visual, ilustração, etc.',
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Descrição detalhada, em inglês ou português, do que a imagem deve mostrar.' },
          },
          required: ['prompt'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'ler_canal',
        description: 'Lê as últimas mensagens reais do canal atual do Discord, pra você se situar sobre do que o pessoal andou falando antes de responder (ex: "sobre o que a gente tava falando?", "resume o que rolou aqui").',
        parameters: {
          type: 'object',
          properties: {
            quantidade: { type: 'integer', description: 'Quantas mensagens recentes ler (padrão 20, máximo 30).' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'consultar_meu_perfil',
        description: 'Consulta os dados de jogo (moedas, cartas na coleção, banco, estatísticas) da PESSOA que está conversando com você agora, igual ao comando /perfil dela. Use quando ela perguntar sobre o progresso/inventário/moedas dela.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'listar_cartas_por_raridade',
        description: 'Lista as cartas do catálogo do jogo que têm uma raridade específica, igual ao comando /raridades.',
        parameters: {
          type: 'object',
          properties: {
            raridade: { type: 'string', enum: RARIDADE_ORDEM, description: 'Uma das 7 raridades do jogo.' },
          },
          required: ['raridade'],
        },
      },
    },
  ];
}

// ---------------------------------------------------------------- ler_canal --
async function ferramentaLerCanal(message, args) {
  const quantidade = Math.min(30, Math.max(1, Number(args?.quantidade) || 20));
  const buscadas = await message.channel.messages.fetch({ limit: quantidade, before: message.id });
  const ordenadas = [...buscadas.values()].reverse(); // mais antiga primeiro
  if (!ordenadas.length) return 'O canal não tem mensagens anteriores a essa.';

  return ordenadas
    .filter(m => m.content?.trim())
    .map(m => `${m.member?.displayName || m.author.username}: ${m.content.slice(0, 300)}`)
    .join('\n')
    .slice(0, 6000); // limite de segurança pra não estourar o contexto do modelo
}

// ------------------------------------------------------- consultar_meu_perfil --
function ferramentaConsultarPerfil(message) {
  const player = getPlayer(message.author.id, message.author.username);
  const contagem = {};
  for (const idCarta of player.colecao) contagem[idCarta] = (contagem[idCarta] || 0) + 1;
  const topCartas = Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, qtd]) => `${CARDS[id]?.nome || id} x${qtd}`);

  return JSON.stringify({
    moedasCarteira: player.moedas,
    moedasBanco: player.banco.saldo,
    totalCartasNaColecao: player.colecao.length,
    cartasMaisComuns: topCartas,
    vitorias: player.estatisticas.vitorias,
    derrotas: player.estatisticas.derrotas,
    maiorAndarNaMasmorra: player.estatisticas.maiorAndar,
    fragmentosArcanos: player.fragmentosArcanos,
    cidadeFundada: player.cidade.fundada,
  });
}

// ------------------------------------------------------ listar_cartas_por_raridade --
function ferramentaListarRaridade(args) {
  const raridade = RARIDADE_ORDEM.includes(args?.raridade) ? args.raridade : null;
  if (!raridade) return `Raridade inválida. Use uma destas: ${RARIDADE_ORDEM.join(', ')}.`;
  const cartas = cartasPorRaridade(raridade).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (!cartas.length) return `Nenhuma carta cadastrada com raridade ${raridade}.`;
  return `Cartas ${raridade} (${cartas.length}): ${cartas.map(c => c.nome).join(', ')}`;
}

// --------------------------------------------------------------- dispatcher --
// Retorna { textoParaModelo, imagem? } — imagem (se houver) é { buffer, mimeType }
// e quem chamou (chatBotIA.js) é responsável por anexar ela na mensagem do Discord.
async function executarFerramenta(nome, argsBrutos, message) {
  let args = {};
  try { args = argsBrutos ? JSON.parse(argsBrutos) : {}; } catch { /* args malformado do modelo — ignora, usa padrão */ }

  try {
    switch (nome) {
      case 'gerar_imagem': {
        const imagem = await gerarImagem(args.prompt);
        return { textoParaModelo: 'Imagem gerada com sucesso e já anexada na sua resposta. Comente sobre ela brevemente.', imagem };
      }
      case 'ler_canal':
        return { textoParaModelo: await ferramentaLerCanal(message, args) };
      case 'consultar_meu_perfil':
        return { textoParaModelo: ferramentaConsultarPerfil(message) };
      case 'listar_cartas_por_raridade':
        return { textoParaModelo: ferramentaListarRaridade(args) };
      default:
        return { textoParaModelo: `Ferramenta "${nome}" não existe.` };
    }
  } catch (err) {
    console.error(`[chatIATools] Ferramenta "${nome}" falhou:`, err);
    const msg = err instanceof ErroImagem ? err.message : `Erro ao executar ${nome}: ${err.message}`;
    // Prefixo "[ERRO_FERRAMENTA]" pra o prompt do bot (game/chatBotIA.js) saber
    // que isso é uma falha real e deve avisar o usuário com o motivo, em vez
    // de simplesmente ignorar/inventar que funcionou.
    return { textoParaModelo: `[ERRO_FERRAMENTA] ${msg}` };
  }
}

module.exports = { listaFerramentas, executarFerramenta };
