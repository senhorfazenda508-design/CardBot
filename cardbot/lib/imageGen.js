// Geração de imagens via OpenRouter (endpoint dedicado /api/v1/images).
// Usa a MESMA OPENROUTER_API_KEY que já é usada pro Chat Livre da IA
// (game/chatBotIA.js) e pro Narrador (core/ia.js) — não precisa de chave nova.
//
// Docs: https://openrouter.ai/docs/api/api-reference/images/create-images
// Resposta vem em `data[].b64_json` (bytes da imagem em base64) + media_type.

const OPENROUTER_IMAGES_URL = 'https://openrouter.ai/api/v1/images';
const MODELO_PADRAO = 'google/gemini-2.5-flash-image'; // rápido e barato, bom custo-benefício
const TIMEOUT_MS = 45_000; // gerar imagem demora mais que um texto

class ErroImagem extends Error {}

// Retorna { buffer, mimeType } com os bytes já decodificados, prontos pra
// virar um AttachmentBuilder do discord.js.
async function gerarImagem(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new ErroImagem('OPENROUTER_API_KEY não configurada no .env');
  if (!prompt || !prompt.trim()) throw new ErroImagem('Descreva o que a imagem deve mostrar.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let resposta;
  try {
    resposta = await fetch(OPENROUTER_IMAGES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com',
        'X-Title': 'CardBot RPG',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_IMAGE_MODEL || MODELO_PADRAO,
        prompt: prompt.trim().slice(0, 800),
        n: 1,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new ErroImagem('A geração de imagem demorou demais (timeout).');
    throw new ErroImagem(`Falha de rede ao chamar a OpenRouter (imagens): ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!resposta.ok) {
    let detalhe = '';
    try { detalhe = (await resposta.json())?.error?.message || ''; } catch {}
    throw new ErroImagem(`OpenRouter (imagens) retornou erro ${resposta.status}${detalhe ? `: ${detalhe}` : ''}`);
  }

  const dados = await resposta.json();
  const item = dados?.data?.[0];
  if (!item?.b64_json) throw new ErroImagem('A IA não retornou nenhuma imagem (modelo pode não suportar geração de imagem).');

  return {
    buffer: Buffer.from(item.b64_json, 'base64'),
    mimeType: item.media_type || item.mime_type || 'image/png',
  };
}

module.exports = { gerarImagem, ErroImagem, MODELO_PADRAO };
