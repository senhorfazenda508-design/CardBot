// Diagnóstico isolado da geração de imagem do Chat Livre da IA.
//
// Por que esse arquivo existe: quando "a IA não consegue gerar imagem" dentro
// do Discord, pode ser 1 de vários problemas diferentes (chave errada, sem
// crédito na OpenRouter, política de dados bloqueando o modelo, o próprio
// Groq não chamando a ferramenta, erro no envio pro Discord...). Rodar esse
// script tira o Discord e o Groq da equação e testa SÓ a chamada real pra
// OpenRouter (lib/imageGen.js) — o mesmo código que o bot usa.
//
// Como usar:
//   node diagnosticar-imagem.js
//   node diagnosticar-imagem.js "um dragão vermelho cuspindo fogo, estilo pixel art"
//
// Se isso funcionar mas o bot no Discord continuar dizendo que não consegue,
// o problema está no lado do Groq/tool-calling (game/chatBotIA.js), não na
// geração de imagem em si — veja os logs "[imageGen]" e "[chatIATools]" no
// console do bot pra confirmar.

require('dotenv').config();
const { gerarImagem, MODELO_PADRAO } = require('./lib/imageGen');

const fs = require('fs');
const path = require('path');

async function main() {
  const prompt = process.argv.slice(2).join(' ') || 'um cavaleiro medieval segurando uma espada brilhante, arte digital';
  const modelo = process.env.OPENROUTER_IMAGE_MODEL || MODELO_PADRAO;

  console.log('=== Diagnóstico de geração de imagem (CardBot) ===');
  console.log('Prompt: ', prompt);
  console.log('Modelo: ', modelo);
  console.log('OPENROUTER_API_KEY configurada? ', process.env.OPENROUTER_API_KEY ? `sim (${process.env.OPENROUTER_API_KEY.slice(0, 8)}...)` : 'NÃO — falta no .env');
  console.log('');

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ Pare aqui: OPENROUTER_API_KEY não está no .env. Copie de .env.example e preencha com uma chave válida de https://openrouter.ai/keys');
    process.exit(1);
  }

  const inicio = Date.now();
  try {
    const { buffer, mimeType } = await gerarImagem(prompt);
    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
    const ext = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
    const saida = path.join(__dirname, `diagnostico-imagem.${ext}`);
    fs.writeFileSync(saida, buffer);

    console.log(`✅ Sucesso em ${segundos}s! Tipo: ${mimeType}, ${buffer.length} bytes.`);
    console.log(`Imagem salva em: ${saida}`);
    console.log('');
    console.log('Isso confirma que a chave, o modelo e a conta da OpenRouter estão OK.');
    console.log('Se o bot no Discord ainda falhar, o problema é no fluxo do Groq/tool-calling, não aqui.');
  } catch (err) {
    console.error('❌ Falhou:', err.message);
    console.log('');
    console.log('A mensagem de erro acima já foi pensada pra dizer exatamente o que corrigir');
    console.log('(chave, crédito, política de dados ou modelo). Corrija e rode de novo.');
    process.exit(1);
  }
}

main();
