// Wrapper simples pra API da DeepSeek (compatível com o formato /chat/completions da OpenAI).
// Docs: https://api-docs.deepseek.com

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODELO_PADRAO = 'deepseek-flash';
const TIMEOUT_MS = 20_000;

class ErroIA extends Error {}

// mensagens: array no formato [{ role: 'system'|'user'|'assistant', content: '...' }]
// options.responseFormat: opcional, ex. { type: 'json_object' } pra forçar saída em JSON puro.
async function chatCompletion(mensagens, { maxTokens = 300, temperature = 0.9, responseFormat = null } = {}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new ErroIA('DEEPSEEK_API_KEY não configurada no .env');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const body = {
    model: process.env.DEEPSEEK_MODEL || MODELO_PADRAO,
    messages: mensagens,
    max_tokens: maxTokens,
    temperature,
  };
  if (responseFormat) body.response_format = responseFormat;

  let resposta;
  try {
    resposta = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new ErroIA('A IA demorou demais pra responder (timeout).');
    throw new ErroIA(`Falha de rede ao chamar a DeepSeek: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!resposta.ok) {
    let detalhe = '';
    try { detalhe = (await resposta.json())?.error?.message || ''; } catch {}
    throw new ErroIA(`DeepSeek retornou erro ${resposta.status}${detalhe ? `: ${detalhe}` : ''}`);
  }

  const dados = await resposta.json();
  const texto = dados?.choices?.[0]?.message?.content?.trim();
  if (!texto) throw new ErroIA('A IA não retornou nenhuma resposta.');
  return texto;
}

module.exports = { chatCompletion, ErroIA, MODELO_PADRAO };
