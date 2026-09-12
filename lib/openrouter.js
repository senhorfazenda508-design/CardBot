// Wrapper simples pra API da OpenRouter (compatível com o formato /chat/completions da OpenAI).
// Docs: https://openrouter.ai/docs

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODELO_PADRAO = 'openai/gpt-4o-mini';
const TIMEOUT_MS = 20_000;

class ErroIA extends Error {}

// mensagens: array no formato [{ role: 'system'|'user'|'assistant', content: '...' }]
async function chatCompletion(mensagens, { maxTokens = 300, temperature = 0.9 } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new ErroIA('OPENROUTER_API_KEY não configurada no .env');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let resposta;
  try {
    resposta = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // Cabeçalhos opcionais que a OpenRouter recomenda pra identificar o app nos rankings/logs deles
        'HTTP-Referer': 'https://github.com',
        'X-Title': 'CardBot RPG',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || MODELO_PADRAO,
        messages: mensagens,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new ErroIA('A IA demorou demais pra responder (timeout).');
    throw new ErroIA(`Falha de rede ao chamar a OpenRouter: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!resposta.ok) {
    let detalhe = '';
    try { detalhe = (await resposta.json())?.error?.message || ''; } catch {}
    throw new ErroIA(`OpenRouter retornou erro ${resposta.status}${detalhe ? `: ${detalhe}` : ''}`);
  }

  const dados = await resposta.json();
  const texto = dados?.choices?.[0]?.message?.content?.trim();
  if (!texto) throw new ErroIA('A IA não retornou nenhuma resposta.');
  return texto;
}

module.exports = { chatCompletion, ErroIA, MODELO_PADRAO };
