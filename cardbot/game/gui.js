const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const { CARDS, RARIDADE_ORDEM } = require('./cards');
const MONSTER_EMOJI_IDS = require('./monsterEmojis');
const { obterCenario } = require('./scenarios');
const { statusAtivos } = require('./status');
const { TAMANHO_GRID, LOTE_CASTELO, EDIFICIOS } = require('./city');

const PASTA_MONSTROS = path.join(__dirname, '..', 'assets', 'monstros');
const PASTA_STATUS = path.join(__dirname, '..', 'assets', 'status');
const cacheImagens = new Map();
const cacheStatus = new Map();

// Carrega o ícone local de um status (veneno.png, queimadura.png, etc.).
// Se não existir, quem chama cai pro emoji do catálogo em game/status.js.
async function bufferImagemStatus(id) {
  if (cacheStatus.has(id)) return cacheStatus.get(id);
  let img = null;
  const caminho = path.join(PASTA_STATUS, `${id}.png`);
  if (fs.existsSync(caminho)) {
    try { img = await loadImage(caminho); } catch { img = null; }
  }
  cacheStatus.set(id, img);
  return img;
}

async function bufferImagemMonstro(id) {
  if (cacheImagens.has(id)) return cacheImagens.get(id);

  let img = null;

  // 1) Arquivo local (se você colocar uma arte própria em assets/monstros/<id>.png, ela tem prioridade)
  const caminho = path.join(PASTA_MONSTROS, `${id}.png`);
  if (fs.existsSync(caminho)) {
    try { img = await loadImage(caminho); } catch { img = null; }
  }

  // 2) Emoji de aplicação do Discord (busca direto do CDN pelo id do emoji)
  if (!img && MONSTER_EMOJI_IDS[id]) {
    const url = `https://cdn.discordapp.com/emojis/${MONSTER_EMOJI_IDS[id]}.png?size=256`;
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CardBot/1.0; +https://discord.com)' },
      });
      if (resp.ok) {
        const arr = await resp.arrayBuffer();
        img = await loadImage(Buffer.from(arr));
      } else {
        console.warn(`[monstro:${id}] o CDN respondeu status ${resp.status} para ${url} — confira se o id do emoji está certo.`);
      }
    } catch (err) {
      console.warn(`[monstro:${id}] falha ao carregar o emoji do CDN (${url}):`, err.message);
      img = null;
    }
  }

  cacheImagens.set(id, img);
  return img;
}

// Recolore uma imagem (multiplica pelos canais RGB de uma cor) — usado pra criar
// a versão "chefe/elite" da mesma arte sem precisar desenhar uma nova.
function aplicarTint(ctx, x, y, w, h, corHex) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = corHex;
  ctx.globalAlpha = 0.38;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// ---------- Paleta ----------
const COR_FUNDO = '#1e1f29';
const COR_PAINEL = '#2b2d3a';
const COR_BORDA = '#4a4d63';
const COR_TEXTO = '#f2f2f5';
const COR_TEXTO_FRACO = '#a9abbd';
const COR_HP_CHEIO = '#57c96b';
const COR_HP_MEDIO = '#e0c341';
const COR_HP_BAIXO = '#e04b4b';
const COR_ESCUDO = '#4aa9e0';

const RARIDADE_HEX = {
  Comum: '#9e9e9e',
  Incomum: '#4caf50',
  Raro: '#3aa0ff',
  'Épico': '#c04af0',
  'Lendário': '#ffb300',
  'Mítico': '#00e5c7',
  'Ancestral': '#ff3860',
};

// Raridades a partir daqui ganham uma outline extra (a "moldura" colorida da raridade)
const RARIDADES_COM_OUTLINE_EXTRA = ['Raro', 'Épico', 'Lendário', 'Mítico', 'Ancestral'];
// Raridades a partir daqui ganham também brilho (glow) na outline extra
const RARIDADES_COM_GLOW = ['Épico', 'Lendário', 'Mítico', 'Ancestral'];

async function bufferAvatar(url) {
  try {
    const resp = await fetch(url);
    const arr = await resp.arrayBuffer();
    return await loadImage(Buffer.from(arr));
  } catch {
    return null;
  }
}

function painelArredondado(ctx, x, y, w, h, r, corBorda, alphaFundo = 1) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.save();
  ctx.globalAlpha = alphaFundo;
  ctx.fillStyle = COR_PAINEL;
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = corBorda || COR_BORDA;
  ctx.stroke();
}

function barra(ctx, x, y, w, h, pct, corCheio) {
  ctx.fillStyle = '#12131a';
  ctx.fillRect(x, y, w, h);
  const largura = Math.max(0, Math.min(1, pct)) * (w - 4);
  ctx.fillStyle = corCheio;
  ctx.fillRect(x + 2, y + 2, largura, h - 4);
  ctx.strokeStyle = COR_BORDA;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function corHp(pct) {
  if (pct > 0.5) return COR_HP_CHEIO;
  if (pct > 0.2) return COR_HP_MEDIO;
  return COR_HP_BAIXO;
}

// Desenha um ícone vetorial simples com base no efeito da carta (sem depender de fontes de emoji)
function desenharIconeCarta(ctx, carta, cx, cy, tamanho) {
  const s = tamanho;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = '#e8e8ee';
  ctx.fillStyle = '#e8e8ee';
  ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.lineCap = 'round';

  switch (carta.efeito) {
    case 'escudo':
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.45);
      ctx.lineTo(s * 0.4, -s * 0.25);
      ctx.lineTo(s * 0.4, s * 0.1);
      ctx.quadraticCurveTo(s * 0.4, s * 0.45, 0, s * 0.5);
      ctx.quadraticCurveTo(-s * 0.4, s * 0.45, -s * 0.4, s * 0.1);
      ctx.lineTo(-s * 0.4, -s * 0.25);
      ctx.closePath();
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      break;
    case 'cura':
      ctx.beginPath();
      ctx.roundRect(-s * 0.18, -s * 0.42, s * 0.36, s * 0.5, 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.5);
      ctx.lineTo(s * 0.08, -s * 0.5);
      ctx.lineTo(s * 0.08, -s * 0.42);
      ctx.lineTo(-s * 0.08, -s * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.15);
      ctx.lineTo(0, s * 0.15);
      ctx.moveTo(-s * 0.13, 0);
      ctx.lineTo(s * 0.13, 0);
      ctx.stroke();
      break;
    case 'roubo':
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.11, -s * 0.13, s * 0.06, 0, Math.PI * 2);
      ctx.arc(s * 0.11, -s * 0.13, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.16, s * 0.16);
      ctx.lineTo(-s * 0.08, s * 0.42);
      ctx.moveTo(0, s * 0.18);
      ctx.lineTo(0, s * 0.44);
      ctx.moveTo(s * 0.16, s * 0.16);
      ctx.lineTo(s * 0.08, s * 0.42);
      ctx.stroke();
      break;
    case 'critico':
      ctx.beginPath();
      ctx.moveTo(s * 0.12, -s * 0.5);
      ctx.lineTo(-s * 0.2, s * 0.05);
      ctx.lineTo(s * 0.02, s * 0.05);
      ctx.lineTo(-s * 0.12, s * 0.5);
      ctx.lineTo(s * 0.25, -s * 0.1);
      ctx.lineTo(s * 0.02, -s * 0.1);
      ctx.closePath();
      ctx.fillStyle = '#ffe066';
      ctx.fill();
      break;
    default: // espada / dano puro
      ctx.beginPath();
      ctx.moveTo(-s * 0.32, s * 0.42);
      ctx.lineTo(s * 0.28, -s * 0.38);
      ctx.lineTo(s * 0.4, -s * 0.5);
      ctx.lineTo(s * 0.5, -s * 0.4);
      ctx.lineTo(s * 0.38, -s * 0.28);
      ctx.lineTo(-s * 0.2, s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, s * 0.22);
      ctx.lineTo(-s * 0.22, s * 0.4);
      ctx.stroke();
  }
  ctx.restore();
}

// Cor do ícone central muda conforme a quantidade que o jogador possui daquela carta —
// é o "muda a cor do emoji quando tem repetido" pedido pro inventário.
function corPorQuantidade(qtd) {
  if (qtd >= 10) return '#ff3860'; // pilha máxima, "em chamas"
  if (qtd >= 7) return '#ff6f3c';
  if (qtd >= 4) return '#ffb300';
  if (qtd >= 2) return '#3aa0ff';
  return '#2b2d3a'; // única cópia — cor neutra escura sobre o cartão branco
}

// Desenha o ícone central de acordo com o TIPO do item (mais variedade visual que só o efeito)
function desenharIconeTipo(ctx, tipo, s, cor) {
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.fillStyle = cor;
  ctx.lineWidth = Math.max(2, s * 0.09);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (tipo) {
    case 'adaga':
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, s * 0.4);
      ctx.lineTo(s * 0.14, -s * 0.22);
      ctx.lineTo(s * 0.26, -s * 0.34);
      ctx.lineTo(s * 0.34, -s * 0.26);
      ctx.lineTo(s * 0.22, -s * 0.14);
      ctx.lineTo(-s * 0.1, s * 0.46);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, s * 0.14);
      ctx.lineTo(s * 0.02, -s * 0.12);
      ctx.moveTo(-s * 0.34, s * 0.22);
      ctx.lineTo(-s * 0.06, s * 0.36);
      ctx.stroke();
      break;
    case 'machado':
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.48);
      ctx.lineTo(-s * 0.05, s * 0.48);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.4);
      ctx.quadraticCurveTo(-s * 0.55, -s * 0.36, -s * 0.5, -s * 0.05);
      ctx.quadraticCurveTo(-s * 0.4, s * 0.02, -s * 0.05, -s * 0.06);
      ctx.closePath();
      ctx.fill();
      break;
    case 'martelo':
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.05);
      ctx.lineTo(0, s * 0.48);
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-s * 0.4, -s * 0.48, s * 0.8, s * 0.34, 4);
      ctx.fill();
      break;
    case 'cajado':
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.28);
      ctx.lineTo(0, s * 0.48);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -s * 0.38, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -s * 0.38, s * 0.16, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.stroke();
      break;
    case 'escudo':
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.45);
      ctx.lineTo(s * 0.4, -s * 0.25);
      ctx.lineTo(s * 0.4, s * 0.1);
      ctx.quadraticCurveTo(s * 0.4, s * 0.45, 0, s * 0.5);
      ctx.quadraticCurveTo(-s * 0.4, s * 0.45, -s * 0.4, s * 0.1);
      ctx.lineTo(-s * 0.4, -s * 0.25);
      ctx.closePath();
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      break;
    case 'pocao':
      ctx.beginPath();
      ctx.roundRect(-s * 0.18, -s * 0.42, s * 0.36, s * 0.5, 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.5);
      ctx.lineTo(s * 0.08, -s * 0.5);
      ctx.lineTo(s * 0.08, -s * 0.42);
      ctx.lineTo(-s * 0.08, -s * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.14, s * 0.05);
      ctx.lineTo(s * 0.14, s * 0.05);
      ctx.lineTo(s * 0.1, s * 0.32);
      ctx.lineTo(-s * 0.1, s * 0.32);
      ctx.closePath();
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    case 'foice':
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, s * 0.48);
      ctx.lineTo(s * 0.05, -s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.05, -s * 0.22, s * 0.32, Math.PI * 0.15, Math.PI * 1.35);
      ctx.stroke();
      break;
    case 'lanca':
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.1);
      ctx.lineTo(0, s * 0.48);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(s * 0.16, -s * 0.12);
      ctx.lineTo(0, -s * 0.22);
      ctx.lineTo(-s * 0.16, -s * 0.12);
      ctx.closePath();
      ctx.fill();
      break;
    case 'arco':
      ctx.beginPath();
      ctx.arc(-s * 0.05, 0, s * 0.42, -Math.PI * 0.38, Math.PI * 0.38);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.28, -s * 0.32);
      ctx.lineTo(s * 0.28, s * 0.32);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, 0);
      ctx.lineTo(s * 0.32, 0);
      ctx.lineTo(s * 0.16, -s * 0.1);
      ctx.moveTo(s * 0.32, 0);
      ctx.lineTo(s * 0.16, s * 0.1);
      ctx.stroke();
      break;
    case 'orbe':
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.34, 0, Math.PI * 2);
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.17, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'coroa':
      ctx.beginPath();
      ctx.moveTo(-s * 0.38, s * 0.22);
      ctx.lineTo(-s * 0.38, -s * 0.08);
      ctx.lineTo(-s * 0.2, s * 0.1);
      ctx.lineTo(0, -s * 0.38);
      ctx.lineTo(s * 0.2, s * 0.1);
      ctx.lineTo(s * 0.38, -s * 0.08);
      ctx.lineTo(s * 0.38, s * 0.22);
      ctx.closePath();
      ctx.fill();
      break;
    case 'livro':
      ctx.beginPath();
      ctx.roundRect(-s * 0.36, -s * 0.4, s * 0.72, s * 0.8, 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.4);
      ctx.lineTo(0, s * 0.4);
      ctx.moveTo(-s * 0.2, -s * 0.15);
      ctx.lineTo(-s * 0.06, -s * 0.15);
      ctx.moveTo(s * 0.06, -s * 0.15);
      ctx.lineTo(s * 0.2, -s * 0.15);
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.stroke();
      break;
    default: // espada — usada também como padrão de reserva
      ctx.beginPath();
      ctx.moveTo(-s * 0.32, s * 0.42);
      ctx.lineTo(s * 0.28, -s * 0.38);
      ctx.lineTo(s * 0.4, -s * 0.5);
      ctx.lineTo(s * 0.5, -s * 0.4);
      ctx.lineTo(s * 0.38, -s * 0.28);
      ctx.lineTo(-s * 0.2, s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, s * 0.22);
      ctx.lineTo(-s * 0.22, s * 0.4);
      ctx.stroke();
  }
  ctx.restore();
}

// ---------- "Emoji" composto da carta ----------
// A pedido: 2 "emojis" combinados — um cartão pintado todo de branco (a moldura) e,
// no meio, um ícone que representa o item. Se o jogador tiver mais de uma cópia, a cor
// do ícone central muda (indicando a pilha). Cartas Raras ou melhores ganham mais uma
// outline por cima, na cor da raridade — e raridades altas ainda ganham um brilho (glow).
function desenharEmojiCarta(ctx, carta, cx, cy, tamanho, quantidade = 1) {
  const s = tamanho;
  const corRaridade = RARIDADE_HEX[carta.raridade] || RARIDADE_HEX.Comum;
  const temOutlineExtra = RARIDADES_COM_OUTLINE_EXTRA.includes(carta.raridade);
  const temGlow = RARIDADES_COM_GLOW.includes(carta.raridade);

  ctx.save();
  ctx.translate(cx, cy);

  // outline extra de raridade (por fora do cartão branco)
  if (temOutlineExtra) {
    ctx.save();
    if (temGlow) {
      ctx.shadowColor = corRaridade;
      ctx.shadowBlur = s * 0.22;
    }
    ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.strokeStyle = corRaridade;
    ctx.beginPath();
    ctx.roundRect(-s * 0.56, -s * 0.66, s * 1.12, s * 1.32, s * 0.16);
    ctx.stroke();
    ctx.restore();
  }

  // "emoji" 1: cartão pintado de branco (a moldura)
  ctx.save();
  ctx.fillStyle = '#f5f5fa';
  ctx.strokeStyle = temOutlineExtra ? corRaridade : '#c9cad6';
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.beginPath();
  ctx.roundRect(-s * 0.46, -s * 0.56, s * 0.92, s * 1.12, s * 0.13);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // "emoji" 2: ícone do item, no meio, colorido conforme a quantidade
  const corIcone = corPorQuantidade(quantidade);
  desenharIconeTipo(ctx, carta.tipo, s * 0.62, corIcone);

  ctx.restore();
}

const PASTA_CENARIOS = path.join(__dirname, '..', 'assets', 'cenarios');
const cacheCenarios = new Map();

async function bufferImagemCenario(id) {
  if (cacheCenarios.has(id)) return cacheCenarios.get(id);
  let img = null;
  for (const ext of ['png', 'jpg', 'jpeg']) {
    const caminho = path.join(PASTA_CENARIOS, `${id}.${ext}`);
    if (fs.existsSync(caminho)) {
      try { img = await loadImage(caminho); break; } catch { img = null; }
    }
  }
  cacheCenarios.set(id, img);
  return img;
}

// Desenha a imagem cobrindo toda a área (cortando o excesso), tipo "background-size: cover"
function desenharImagemCover(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sw, sh, sx, sy;
  if (imgRatio > boxRatio) {
    sh = img.height;
    sw = sh * boxRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / boxRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Desenha o fundo da cena: usa a imagem enviada (se existir) ou o desenho por código como reserva
async function desenharFundoCenario(ctx, W, H, andar) {
  const cenario = obterCenario(andar);
  const imagemFundo = await bufferImagemCenario(cenario.id);
  if (imagemFundo) {
    desenharImagemCover(ctx, imagemFundo, 0, 0, W, H);
  } else {
    cenario.desenhar(ctx, W, H);
  }
  return cenario;
}

// Sombra oval no chão, pra "ancorar" um personagem numa posição da cena
function desenharSombraChao(ctx, cx, cy, largura) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, largura, largura * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function desenharSiluetaMonstro(ctx, cx, cy, raio) {
  ctx.save();
  ctx.fillStyle = '#e8e8ee';
  // olhos
  ctx.beginPath();
  ctx.arc(cx - raio * 0.32, cy - raio * 0.15, raio * 0.16, 0, Math.PI * 2);
  ctx.arc(cx + raio * 0.32, cy - raio * 0.15, raio * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e04b4b';
  ctx.beginPath();
  ctx.arc(cx - raio * 0.32, cy - raio * 0.15, raio * 0.07, 0, Math.PI * 2);
  ctx.arc(cx + raio * 0.32, cy - raio * 0.15, raio * 0.07, 0, Math.PI * 2);
  ctx.fill();
  // boca em zigue-zague (dentes)
  ctx.beginPath();
  ctx.moveTo(cx - raio * 0.4, cy + raio * 0.3);
  for (let i = 0; i <= 5; i++) {
    const x = cx - raio * 0.4 + (raio * 0.8 * i) / 5;
    const y = cy + raio * 0.3 + (i % 2 === 0 ? raio * 0.15 : 0);
    ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#e8e8ee';
  ctx.lineWidth = Math.max(2, raio * 0.05);
  ctx.stroke();
  ctx.restore();
}

// Mini ícone de escudo (usado no indicador de escudo ativo)
function desenharIconeEscudoMini(ctx, cx, cy, tamanho) {
  const s = tamanho;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = COR_ESCUDO;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.lineTo(s * 0.42, -s * 0.28);
  ctx.lineTo(s * 0.42, s * 0.05);
  ctx.quadraticCurveTo(s * 0.42, s * 0.45, 0, s * 0.55);
  ctx.quadraticCurveTo(-s * 0.42, s * 0.45, -s * 0.42, s * 0.05);
  ctx.lineTo(-s * 0.42, -s * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
async function renderEncontro(monstro, andar) {
  const W = 700, H = 340;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const cenario = await desenharFundoCenario(ctx, W, H, andar);

  painelArredondado(ctx, 20, 20, W - 40, H - 40, 18, '#e04b4b', 0.45);

  ctx.fillStyle = COR_TEXTO_FRACO;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ANDAR ${andar} · ${cenario.nome.toUpperCase()}`, W / 2, 60);

  // monstro (sem fundo/borda — o emoji já é transparente, deixa ele "flutuar" na cena)
  const cx = W / 2, cy = 165;
  const raio = 70;
  desenharSombraChao(ctx, cx, cy + raio * 0.8, raio * 0.85);

  const imgMonstro = await bufferImagemMonstro(monstro.id);
  if (imgMonstro) {
    const tam = raio * 2;
    const corBrilho = monstro.elite ? '#ffb300' : monstro.corTint;
    ctx.save();
    if (corBrilho) {
      ctx.shadowColor = corBrilho;
      ctx.shadowBlur = monstro.elite ? 20 : 14;
    }
    ctx.drawImage(imgMonstro, cx - tam / 2, cy - tam / 2, tam, tam);
    ctx.restore();
    // Recolore a MESMA arte pra criar a variante colorida (elite fica dourado; senão usa a cor do elemento)
    if (monstro.elite) aplicarTint(ctx, cx - tam / 2, cy - tam / 2, tam, tam, '#ffb300');
    else if (monstro.corTint) aplicarTint(ctx, cx - tam / 2, cy - tam / 2, tam, tam, monstro.corTint);
  } else {
    desenharSiluetaMonstro(ctx, cx, cy, raio - 10);
  }

  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = COR_TEXTO;
  ctx.fillText(`Um(a) ${monstro.nome} apareceu!`, W / 2, 260);

  barra(ctx, W / 2 - 200, 285, 400, 22, monstro.hp / monstro.hpMax, corHp(monstro.hp / monstro.hpMax));
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = COR_TEXTO;
  ctx.fillText(`${monstro.hp}/${monstro.hpMax} HP`, W / 2, 301);

  return canvas.toBuffer('image/png');
}

// ---------- Tela de batalha (jogador vs monstro) ----------
async function renderBatalha(player, avatarURL, monstro) {
  const W = 760, H = 380;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const cenario = await desenharFundoCenario(ctx, W, H, player.run.andar);

  painelArredondado(ctx, 16, 16, W - 32, H - 32, 16, COR_BORDA, 0.28);

  ctx.textAlign = 'center';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = COR_TEXTO_FRACO;
  ctx.fillText(`ANDAR ${player.run.andar} · ${cenario.nome.toUpperCase()}`, W / 2, 40);

  // --- monstro: ao fundo, mais alto e menor (mais longe da "câmera"), sem fundo/borda ---
  const mx = W * 0.74, my = H * 0.32;
  const mRaio = 46;
  desenharSombraChao(ctx, mx, my + mRaio * 0.85, mRaio * 0.8);

  const imgMonstroBatalha = await bufferImagemMonstro(monstro.id);
  if (imgMonstroBatalha) {
    const tam = mRaio * 2;
    const corBrilhoBatalha = monstro.elite ? '#ffb300' : monstro.corTint;
    ctx.save();
    if (corBrilhoBatalha) {
      ctx.shadowColor = corBrilhoBatalha;
      ctx.shadowBlur = monstro.elite ? 16 : 10;
    }
    ctx.drawImage(imgMonstroBatalha, mx - tam / 2, my - tam / 2, tam, tam);
    ctx.restore();
    if (monstro.elite) aplicarTint(ctx, mx - tam / 2, my - tam / 2, tam, tam, '#ffb300');
    else if (monstro.corTint) aplicarTint(ctx, mx - tam / 2, my - tam / 2, tam, tam, monstro.corTint);
  } else {
    desenharSiluetaMonstro(ctx, mx, my, mRaio - 8);
  }

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = COR_TEXTO;
  ctx.fillText(monstro.nome, mx, my + mRaio + 22);
  barra(ctx, mx - 85, my + mRaio + 30, 170, 16, monstro.hp / monstro.hpMax, corHp(monstro.hp / monstro.hpMax));
  ctx.font = '12px sans-serif';
  ctx.fillText(`${monstro.hp}/${monstro.hpMax} HP`, mx, my + mRaio + 60);

  // --- jogador: em primeiro plano, mais baixo e maior (mais perto da "câmera") ---
  const px = W * 0.24, py = H * 0.62;
  const pRaio = 62;
  desenharSombraChao(ctx, px, py + pRaio * 0.85, pRaio * 0.9);
  const avatar = await bufferAvatar(avatarURL);
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, pRaio, 0, Math.PI * 2);
  ctx.fillStyle = '#12131a';
  ctx.fill();
  ctx.clip();
  if (avatar) {
    ctx.drawImage(avatar, px - pRaio, py - pRaio, pRaio * 2, pRaio * 2);
  }
  ctx.restore();
  ctx.lineWidth = 4;
  ctx.strokeStyle = COR_HP_CHEIO;
  ctx.beginPath();
  ctx.arc(px, py, pRaio, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = COR_TEXTO;
  ctx.fillText('Você', px, py + pRaio + 26);
  barra(ctx, px - 100, py + pRaio + 34, 200, 18, player.run.hp / player.run.hpMax, corHp(player.run.hp / player.run.hpMax));
  ctx.font = '13px sans-serif';
  ctx.fillText(`${player.run.hp}/${player.run.hpMax} HP`, px, py + pRaio + 66);
  if (player.run.escudo > 0) {
    desenharIconeEscudoMini(ctx, px - 34, py + pRaio + 80, 16);
    ctx.fillStyle = COR_ESCUDO;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`+${player.run.escudo}`, px - 20, py + pRaio + 84);
    ctx.textAlign = 'center';
  }

  // Ícones dos status ruins ativos no jogador (veneno, medo, paralisia...) —
  // usa a arte local em assets/status/<id>.png se existir, senão desenha o
  // emoji do catálogo como um circulozinho colorido.
  const statusJogador = statusAtivos(player.run);
  if (statusJogador.length) {
    const iconeTam = 26, gap = 6;
    let ix = px - ((statusJogador.length * (iconeTam + gap)) - gap) / 2 + iconeTam / 2;
    const iy = py + pRaio + 100;
    for (const st of statusJogador) {
      const img = await bufferImagemStatus(st.id);
      ctx.save();
      ctx.beginPath();
      ctx.arc(ix, iy, iconeTam / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#12131a';
      ctx.fill();
      ctx.clip();
      if (img) {
        ctx.drawImage(img, ix - iconeTam / 2, iy - iconeTam / 2, iconeTam, iconeTam);
      } else {
        ctx.font = `${Math.floor(iconeTam * 0.7)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.emoji, ix, iy);
        ctx.textBaseline = 'alphabetic';
      }
      ctx.restore();
      ctx.strokeStyle = '#e04b4b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ix, iy, iconeTam / 2, 0, Math.PI * 2);
      ctx.stroke();
      ix += iconeTam + gap;
    }
    ctx.textAlign = 'center';
  }

  return canvas.toBuffer('image/png');
}

function quebrarLinhas(ctx, texto, maxW) {
  const palavras = texto.replace(/\n/g, ' ⏵ ').split(' ');
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? atual + ' ' + p : p;
    if (ctx.measureText(teste).width > maxW && atual) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

// ---------- Inventário em grade de slots (estilo Minecraft) ----------
async function renderInventario(username, colecaoIds, filtroRaridade = null) {
  const idsFiltrados = filtroRaridade
    ? colecaoIds.filter(id => CARDS[id] && CARDS[id].raridade === filtroRaridade)
    : colecaoIds;

  const contagem = {};
  for (const id of idsFiltrados) contagem[id] = (contagem[id] || 0) + 1;
  const itensUnicos = Object.keys(contagem)
    .map(id => CARDS[id])
    .filter(Boolean)
    .sort((a, b) => RARIDADE_ORDEM.indexOf(a.raridade) - RARIDADE_ORDEM.indexOf(b.raridade));

  const COLUNAS = 6;
  const SLOT = 88;
  const GAP = 10;
  const MARGEM = 24;
  const linhas = Math.max(1, Math.ceil(itensUnicos.length / COLUNAS));

  const W = MARGEM * 2 + COLUNAS * SLOT + (COLUNAS - 1) * GAP;
  const H = 90 + linhas * (SLOT + GAP);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = COR_FUNDO;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'left';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = COR_TEXTO;
  ctx.fillText(`Inventário — ${username}${filtroRaridade ? ` · ${filtroRaridade}` : ''}`, MARGEM, 40);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = COR_TEXTO_FRACO;
  ctx.fillText(`${idsFiltrados.length} cartas · ${itensUnicos.length} tipos diferentes`, MARGEM, 62);

  if (itensUnicos.length === 0) {
    ctx.font = 'italic 15px sans-serif';
    ctx.fillStyle = COR_TEXTO_FRACO;
    ctx.fillText('Nenhuma carta nessa raridade ainda.', MARGEM, 100);
  }

  itensUnicos.forEach((carta, idx) => {
    const col = idx % COLUNAS;
    const row = Math.floor(idx / COLUNAS);
    const x = MARGEM + col * (SLOT + GAP);
    const y = 84 + row * (SLOT + GAP);
    const corBorda = RARIDADE_HEX[carta.raridade];

    // fundo do slot, estilo "shop" (slot escuro com borda fina na cor da raridade)
    ctx.fillStyle = '#141520';
    ctx.beginPath();
    ctx.roundRect(x, y, SLOT, SLOT, 10);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = corBorda;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;

    const qtd = contagem[carta.id];
    desenharEmojiCarta(ctx, carta, x + SLOT / 2, y + SLOT / 2 - 4, SLOT * 0.58, qtd);

    if (qtd > 1) {
      const bx = x + SLOT - 4, by = y + SLOT - 4;
      ctx.beginPath();
      ctx.arc(bx, by, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#000000cc';
      ctx.fill();
      ctx.strokeStyle = corBorda;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`x${qtd}`, bx, by + 1);
      ctx.textBaseline = 'alphabetic';
    }
  });

  ctx.textAlign = 'left';
  return canvas.toBuffer('image/png');
}

// ---------- Card de perfil ----------
async function renderPerfil(username, avatarURL, player) {
  const W = 560, H = 260;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#20223a');
  grad.addColorStop(1, '#2b1f3a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  painelArredondado(ctx, 12, 12, W - 24, H - 24, 16, '#5865f2');

  const avatar = await bufferAvatar(avatarURL);
  const ax = 100, ay = 100, ar = 62;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.fillStyle = '#12131a';
  ctx.fill();
  ctx.clip();
  if (avatar) ctx.drawImage(avatar, ax - ar, ay - ar, ar * 2, ar * 2);
  ctx.restore();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#5865f2';
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COR_TEXTO;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(username, 190, 60);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#ffd866';
  ctx.fillText(`${player.moedas} moedas`, 190, 92);

  ctx.fillStyle = COR_TEXTO_FRACO;
  ctx.font = '15px sans-serif';
  ctx.fillText(`Vitórias: ${player.estatisticas.vitorias}   Derrotas: ${player.estatisticas.derrotas}`, 190, 118);
  ctx.fillText(`Maior andar: ${player.estatisticas.maiorAndar}   Cartas: ${player.colecao.length}`, 190, 142);
  ctx.fillText(player.run.ativa ? `Em uma run — andar ${player.run.andar}` : 'Sem run ativa', 190, 166);

  // barrinha decorativa por raridade da coleção
  const raridadeContagem = Object.fromEntries(RARIDADE_ORDEM.map(r => [r, 0]));
  for (const id of player.colecao) {
    const c = CARDS[id];
    if (c) raridadeContagem[c.raridade]++;
  }
  let bx = 190;
  const by = 200, bw = 340, bh = 18;
  const total = player.colecao.length || 1;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 6);
  ctx.clip();
  for (const rar of RARIDADE_ORDEM) {
    const frac = raridadeContagem[rar] / total;
    const w = frac * bw;
    ctx.fillStyle = RARIDADE_HEX[rar];
    ctx.fillRect(bx, by, w, bh);
    bx += w;
  }
  ctx.restore();
  ctx.strokeStyle = COR_BORDA;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(190, by, bw, bh, 6);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

// ---------- Carta em detalhe (estilo carta de TCG) ----------
async function renderCartaDetalhe(carta, quantidade) {
  const W = 320, H = 440;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const corBorda = RARIDADE_HEX[carta.raridade];

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1c1d29');
  grad.addColorStop(1, '#2a2b3d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (RARIDADES_COM_GLOW.includes(carta.raridade)) {
    ctx.shadowColor = corBorda;
    ctx.shadowBlur = 24;
  }
  ctx.lineWidth = 6;
  ctx.strokeStyle = corBorda;
  ctx.beginPath();
  ctx.roundRect(10, 10, W - 20, H - 20, 18);
  ctx.stroke();
  ctx.restore();

  // janela do ícone
  ctx.fillStyle = '#12131a';
  ctx.beginPath();
  ctx.roundRect(30, 30, W - 60, 220, 14);
  ctx.fill();
  ctx.strokeStyle = corBorda;
  ctx.lineWidth = 2;
  ctx.stroke();
  desenharEmojiCarta(ctx, carta, W / 2, 140, 150, quantidade || 1);

  ctx.textAlign = 'center';
  ctx.fillStyle = COR_TEXTO;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(carta.nome, W / 2, 285);

  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = corBorda;
  ctx.fillText(carta.raridade.toUpperCase(), W / 2, 308);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = COR_TEXTO;
  ctx.fillText(`Ataque: ${carta.ataque}`, W / 2, 340);

  const descEfeito = {
    nenhum: 'Sem efeito adicional.',
    cura: `Cura ${carta.valor} de vida ao jogar.`,
    roubo: `Rouba ${Math.round(carta.valor * 100)}% do dano como vida.`,
    critico: `${Math.round(carta.valor * 100)}% de chance de dano em dobro.`,
    escudo: `Concede ${carta.valor} de escudo (bloqueia dano).`,
    execucao: `Dano dobrado (x2,2) se o alvo estiver com ${Math.round(carta.valor * 100)}% de vida ou menos.`,
    ceifador: `Dano cresce até +${Math.round(carta.valor * 100)}% quanto mais perto da morte o alvo estiver.`,
    vinganca: `Dano cresce até +${Math.round(carta.valor * 100)}% quanto mais machucado você estiver.`,
    sacrificio: `Perde ${Math.round(carta.valor * 100)}% da sua vida atual pra causar dano bem maior (x2,4).`,
    ultimo_suspiro: `Se sua vida estiver em ${Math.round(carta.valor * 100)}% ou menos, o golpe sai multiplicado (x2,6).`,
    cura_percentual: `Cura ${Math.round(carta.valor * 100)}% do seu HP máximo ao jogar.`,
    roubo_blindado: `Rouba ${Math.round(carta.valor * 100)}% do dano, metade vira vida e metade vira escudo.`,
    brecha: 'Ignora completamente o escudo do alvo nesse golpe.',
    investida_dupla: `Acerta duas vezes — o 2º golpe causa ${Math.round(carta.valor * 100)}% do dano do 1º.`,
    sorte: `Sorteia um bônus: crítico automático, ${carta.valor} de cura ou ${carta.valor} de escudo.`,
  };
  ctx.font = '13px sans-serif';
  ctx.fillStyle = COR_TEXTO_FRACO;
  const linhas = quebrarLinhas(ctx, descEfeito[carta.efeito] || '', W - 60);
  linhas.forEach((linha, i) => ctx.fillText(linha, W / 2, 365 + i * 18));

  if (quantidade) {
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = COR_TEXTO_FRACO;
    ctx.fillText(`Você possui: x${quantidade}`, W / 2, H - 25);
  }

  ctx.textAlign = 'left';
  return canvas.toBuffer('image/png');
}

// ---------- Tela de duelo (jogador vs jogador) ----------
async function renderDuelo({ nomeA, avatarA, hpA, hpMaxA, escudoA, nomeB, avatarB, hpB, hpMaxB, escudoB, turnoNome }) {
  const W = 760, H = 300;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#241a2b');
  grad.addColorStop(1, '#1a2237');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  painelArredondado(ctx, 16, 16, W - 32, H - 32, 16, '#c04af0');

  ctx.textAlign = 'center';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = COR_TEXTO_FRACO;
  ctx.fillText(`DUELO — vez de ${turnoNome}`, W / 2, 44);

  async function ladoJogador(nome, avatarURL, x, y, hp, hpMax, escudo) {
    const avatar = await bufferAvatar(avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 55, 0, Math.PI * 2);
    ctx.fillStyle = '#12131a';
    ctx.fill();
    ctx.clip();
    if (avatar) ctx.drawImage(avatar, x - 55, y - 55, 110, 110);
    ctx.restore();
    ctx.lineWidth = 4;
    ctx.strokeStyle = nome === turnoNome ? '#ffd866' : '#5865f2';
    ctx.beginPath();
    ctx.arc(x, y, 55, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 17px sans-serif';
    ctx.fillStyle = COR_TEXTO;
    ctx.fillText(nome, x, y + 90);
    barra(ctx, x - 100, y + 100, 200, 18, hp / hpMax, corHp(hp / hpMax));
    ctx.font = '13px sans-serif';
    ctx.fillText(`${hp}/${hpMax} HP`, x, y + 132);
    if (escudo > 0) {
      desenharIconeEscudoMini(ctx, x - 34, y + 146, 16);
      ctx.fillStyle = COR_ESCUDO;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`+${escudo}`, x - 20, y + 150);
      ctx.textAlign = 'center';
    }
  }

  await ladoJogador(nomeA, avatarA, 150, 130, hpA, hpMaxA, escudoA);
  await ladoJogador(nomeB, avatarB, W - 150, 130, hpB, hpMaxB, escudoB);

  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#c04af0';
  ctx.fillText('VS', W / 2, 138);

  return canvas.toBuffer('image/png');
}

// ---------- Mapa da cidade ----------
async function renderCidade(username, cidade, pontuacao) {
  const LOTE = 78, GAP = 6, MARGEM = 20;
  const gridPx = TAMANHO_GRID * LOTE + (TAMANHO_GRID - 1) * GAP;
  const W = gridPx + MARGEM * 2;
  const H = gridPx + MARGEM * 2 + 64;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a2b1f');
  grad.addColorStop(1, '#101a14');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'left';
  ctx.fillStyle = COR_TEXTO;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`🏙️ Cidade de ${username}`, MARGEM, 32);
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#ffd866';
  ctx.textAlign = 'right';
  ctx.fillText(`⭐ ${pontuacao} pontos`, W - MARGEM, 32);
  ctx.textAlign = 'left';

  const topoGrid = 52;
  for (let i = 0; i < TAMANHO_GRID * TAMANHO_GRID; i++) {
    const col = i % TAMANHO_GRID;
    const row = Math.floor(i / TAMANHO_GRID);
    const x = MARGEM + col * (LOTE + GAP);
    const y = topoGrid + row * (LOTE + GAP);
    const edificioId = cidade.grid[i];
    const ed = edificioId ? EDIFICIOS[edificioId] : null;

    // relvado do lote
    ctx.fillStyle = (row + col) % 2 === 0 ? '#274a30' : '#22432b';
    ctx.beginPath();
    ctx.roundRect(x, y, LOTE, LOTE, 8);
    ctx.fill();

    if (i === LOTE_CASTELO && !ed) {
      // marca o lote central como o local de fundação antes de existir castelo
      ctx.strokeStyle = '#ffd866';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, LOTE - 6, LOTE - 6, 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (ed) {
      ctx.fillStyle = ed.cor || '#3a3a44';
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, LOTE - 6, LOTE - 6, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ed.cor || '#3a3a44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, LOTE - 6, LOTE - 6, 6);
      ctx.stroke();

      ctx.font = `${Math.floor(LOTE * 0.44)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ed.emoji, x + LOTE / 2, y + LOTE / 2 - 4);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    } else {
      // grama decorativa simples
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, LOTE - 6, LOTE - 6, 6);
      ctx.stroke();
    }
  }

  return canvas.toBuffer('image/png');
}

module.exports = { renderEncontro, renderBatalha, renderInventario, renderPerfil, renderCartaDetalhe, renderDuelo, renderCidade };
