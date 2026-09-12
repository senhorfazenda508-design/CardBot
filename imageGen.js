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
    console.error('[imageGen] Falha de rede/timeout ao chamar a OpenRouter (imagens):', err);
    if (err.name === 'AbortError') throw new ErroImagem('A geração de imagem demorou demais (timeout).');
    throw new ErroImagem(`Falha de rede ao chamar a OpenRouter (imagens): ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!resposta.ok) {
    let corpoErro = null;
    try { corpoErro = await resposta.json(); } catch {}
    const detalhe = corpoErro?.error?.message || '';

    // Log completo no console do bot — sem isso é impossível saber POR QUE a
    // geração falhou (chave errada, sem crédito, política de dados bloqueando
    // o provedor, modelo indisponível, etc.). Isso não vaza pro Discord.
    console.error(
      `[imageGen] OpenRouter respondeu ${resposta.status} ao gerar imagem.`,
      JSON.stringify(corpoErro || {}, null, 2)
    );

    // Traduz as causas mais comuns pra uma mensagem que já dá pra agir em cima,
    // em vez de só repassar o texto cru da API.
    if (resposta.status === 401 || resposta.status === 403) {
      throw new ErroImagem('OPENROUTER_API_KEY inválida, expirada ou sem permissão (confira o .env e o saldo/permissões da conta na OpenRouter).');
    }
    if (resposta.status === 402) {
      throw new ErroImagem('Sem créditos suficientes na conta da OpenRouter pra gerar imagem (geração de imagem é cobrada por imagem — veja https://openrouter.ai/credits).');
    }
    if (resposta.status === 400 && /data.?polic|no endpoints found|not.*allowed/i.test(detalhe)) {
      throw new ErroImagem('A conta da OpenRouter está com uma Política de Dados que bloqueia o provedor deste modelo (ex.: exige "zero data retention"). Ajuste em https://openrouter.ai/settings/privacy ou troque OPENROUTER_IMAGE_MODEL no .env pra um modelo compatível.');
    }
    if (resposta.status === 404 || /model.*not found|no endpoints found/i.test(detalhe)) {
      throw new ErroImagem(`O modelo "${process.env.OPENROUTER_IMAGE_MODEL || MODELO_PADRAO}" não foi encontrado/não está disponível na OpenRouter no momento. Veja modelos válidos em https://openrouter.ai/models?output_modalities=image e ajuste OPENROUTER_IMAGE_MODEL no .env.`);
    }
    throw new ErroImagem(`OpenRouter (imagens) retornou erro ${resposta.status}${detalhe ? `: ${detalhe}` : ''}`);
  }

  const dados = await resposta.json();
  const item = dados?.data?.[0];
  if (!item?.b64_json) {
    console.error('[imageGen] OpenRouter respondeu 200 mas sem imagem em data[0].b64_json:', JSON.stringify(dados, null, 2));
    throw new ErroImagem('A IA não retornou nenhuma imagem (o modelo configurado pode não suportar geração de imagem — confira OPENROUTER_IMAGE_MODEL no .env).');
  }

  return {
    buffer: Buffer.from(item.b64_json, 'base64'),
    mimeType: item.media_type || item.mime_type || 'image/png',
  };
}

module.exports = { gerarImagem, ErroImagem, MODELO_PADRAO };
