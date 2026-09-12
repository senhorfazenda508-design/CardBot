// Wrapper genérico pra API da Groq (compatível com /chat/completions da
// OpenAI), COM suporte a tool calling — usado pelo "cérebro" agente do Chat
// Livre da IA (game/chatBotIA.js) pra decidir quando chamar uma ferramenta
// (gerar imagem, ler o canal, consultar dado de jogador, etc.) em vez de só
// responder texto puro.
//
// Já existia uso direto da Groq em game/npcEngine.js (pros NPCs da vila),
// mas aquele é um caso mais simples (sempre pede JSON, nunca usa tools) —
// esse arquivo aqui é o específico pra fluxo com ferramentas.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELO_PADRAO = 'openai/gpt-oss-120b'; // mesmo modelo já usado pros NPCs — suporta tool calling na Groq
const TIMEOUT_MS = 25_000;

class ErroIA extends Error {}

// mensagens: [{ role, content, tool_calls?, tool_call_id?, name? }, ...]
// tools (opcional): lista no formato de function calling da OpenAI
// Retorna a mensagem BRUTA do assistente (pode ter .content e/ou .tool_calls),
// pra quem chamou decidir se precisa rodar outra rodada com resultado de tool.
async function chatComFerramentas(mensagens, { tools, maxTokens = 900, temperature = 0.7 } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new ErroIA('GROQ_API_KEY não configurada no .env');

  const modelo = process.env.GROQ_MODEL || MODELO_PADRAO;
  const usaRaciocinio = modelo.includes('gpt-oss');

  const body = {
    model: modelo,
    messages: mensagens,
    max_tokens: maxTokens,
    temperature,
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }
  if (usaRaciocinio) body.reasoning_effort = 'low';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let resposta;
  try {
    resposta = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new ErroIA('A IA (Groq) demorou demais pra responder (timeout).');
    throw new ErroIA(`Falha de rede ao chamar a Groq: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!resposta.ok) {
    let detalhe = '';
    try { detalhe = (await resposta.json())?.error?.message || ''; } catch {}
    throw new ErroIA(`Groq retornou erro ${resposta.status}${detalhe ? `: ${detalhe}` : ''}`);
  }

  const dados = await resposta.json();
  const msg = dados?.choices?.[0]?.message;
  if (!msg) throw new ErroIA('A IA (Groq) não retornou nenhuma resposta.');
  return msg;
}

module.exports = { chatComFerramentas, ErroIA, MODELO_PADRAO };
