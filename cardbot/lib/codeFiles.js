// Detecta blocos de código (```linguagem ... ```) numa resposta de texto da
// IA e transforma os "grandes o suficiente pra valer a pena" em arquivo de
// verdade — assim, quando alguém pede "cria um script pra mim" no Chat Livre
// da IA, o bot manda o código também como um ANEXO de verdade (o Discord já
// mostra um preview/viewer de arquivos de texto pequenos automaticamente),
// e não só um bloco de texto que precisa copiar manualmente.

const EXTENSAO_POR_LINGUAGEM = {
  javascript: 'js', js: 'js', jsx: 'jsx',
  typescript: 'ts', ts: 'ts', tsx: 'tsx',
  python: 'py', py: 'py',
  html: 'html', css: 'css', json: 'json',
  java: 'java', c: 'c', cpp: 'cpp', 'c++': 'cpp', csharp: 'cs', cs: 'cs',
  php: 'php', sql: 'sql', go: 'go', golang: 'go',
  rust: 'rs', rs: 'rs', ruby: 'rb', rb: 'rb',
  bash: 'sh', sh: 'sh', shell: 'sh', powershell: 'ps1',
  yaml: 'yml', yml: 'yml', markdown: 'md', md: 'md',
  xml: 'xml', kotlin: 'kt', swift: 'swift', dart: 'dart',
};

// Só vira arquivo se tiver um mínimo de conteúdo — bloco de 2 linhas de
// exemplo não precisa virar download, só o código "de verdade" pedido.
const MIN_CARACTERES_PARA_ARQUIVO = 120;
const REGEX_BLOCO = /```([a-zA-Z0-9+#]*)\n([\s\S]*?)```/g;

// Retorna lista de { nome, conteudo } prontos pra virar AttachmentBuilder.
function extrairArquivosDeCodigo(texto, prefixoNome = 'codigo') {
  const arquivos = [];
  let match;
  let contador = 0;
  REGEX_BLOCO.lastIndex = 0;
  while ((match = REGEX_BLOCO.exec(texto)) !== null) {
    const linguagem = (match[1] || '').toLowerCase().trim();
    const conteudo = match[2];
    if (conteudo.trim().length < MIN_CARACTERES_PARA_ARQUIVO) continue;
    if (linguagem === 'text' || linguagem === 'txt' || linguagem === '') continue; // texto simples não vira arquivo (provável exemplo/output, não código)

    contador++;
    const ext = EXTENSAO_POR_LINGUAGEM[linguagem] || 'txt';
    const nome = contador === 1 ? `${prefixoNome}.${ext}` : `${prefixoNome}_${contador}.${ext}`;
    arquivos.push({ nome, conteudo });
  }
  return arquivos;
}

module.exports = { extrairArquivosDeCodigo };
