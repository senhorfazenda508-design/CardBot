// Cada zona cobre 3 andares. O ciclo se repete a cada 15 andares (junto com os monstros).
function desenharCaverna(ctx, W, H) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#2b2318');
  grad.addColorStop(1, '#14110c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  // estalactites no topo
  for (let i = 0; i < 7; i++) {
    const x = (W / 7) * i + 20;
    const alt = 20 + (i % 3) * 14;
    ctx.beginPath();
    ctx.moveTo(x - 14, 0);
    ctx.lineTo(x + 14, 0);
    ctx.lineTo(x, alt);
    ctx.closePath();
    ctx.fill();
  }
  // pedras na base
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  for (let i = 0; i < 5; i++) {
    const x = (W / 5) * i + 30;
    ctx.beginPath();
    ctx.ellipse(x, H, 40, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function desenharFloresta(ctx, W, H) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#182a1c');
  grad.addColorStop(1, '#0c150e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  // troncos torcidos nas bordas
  [30, W - 30].forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x - 10, H);
    ctx.quadraticCurveTo(x + 15, H * 0.5, x - 5, 0);
    ctx.lineTo(x + 10, 0);
    ctx.quadraticCurveTo(x + 25, H * 0.5, x + 10, H);
    ctx.closePath();
    ctx.fill();
  });
  // névoa
  ctx.fillStyle = 'rgba(180,200,180,0.06)';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse((W / 4) * i + 60, H - 40, 90, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function desenharCripta(ctx, W, H) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#241a2e');
  grad.addColorStop(1, '#120e18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // lápides na base
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  for (let i = 0; i < 6; i++) {
    const x = (W / 6) * i + 25;
    ctx.beginPath();
    ctx.roundRect(x - 16, H - 46, 32, 46, [8, 8, 0, 0]);
    ctx.fill();
  }
  // névoa roxa
  ctx.fillStyle = 'rgba(160,80,220,0.08)';
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.3, W * 0.5, 60, 0, 0, Math.PI * 2);
  ctx.fill();
}

function desenharFortaleza(ctx, W, H) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#232a35');
  grad.addColorStop(1, '#11151c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // colunas quebradas
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  [50, W - 80].forEach(x => {
    ctx.fillRect(x, H * 0.25, 34, H * 0.75);
    ctx.beginPath();
    ctx.ellipse(x + 17, H * 0.25, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // brilho de tocha
  const glow = ctx.createRadialGradient(W / 2, H * 0.15, 10, W / 2, H * 0.15, 140);
  glow.addColorStop(0, 'rgba(255,170,60,0.18)');
  glow.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H * 0.5);
}

function desenharCovilChefe(ctx, W, H) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#2e1414');
  grad.addColorStop(1, '#150808');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // brilho dourado central
  const glow = ctx.createRadialGradient(W / 2, H * 0.35, 10, W / 2, H * 0.35, W * 0.4);
  glow.addColorStop(0, 'rgba(255,180,40,0.16)');
  glow.addColorStop(1, 'rgba(255,180,40,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // chamas na base
  ctx.fillStyle = 'rgba(255,90,40,0.35)';
  for (let i = 0; i < 8; i++) {
    const x = (W / 8) * i + 20;
    ctx.beginPath();
    ctx.moveTo(x - 10, H);
    ctx.quadraticCurveTo(x, H - 34 - (i % 3) * 8, x + 10, H);
    ctx.closePath();
    ctx.fill();
  }
}

const ZONAS = [
  { id: 'caverna_sombria', nome: 'Caverna Sombria', desenhar: desenharCaverna },
  { id: 'floresta_amaldicoada', nome: 'Floresta Amaldiçoada', desenhar: desenharFloresta },
  { id: 'cripta_antiga', nome: 'Cripta Antiga', desenhar: desenharCripta },
  { id: 'fortaleza_em_ruinas', nome: 'Fortaleza em Ruínas', desenhar: desenharFortaleza },
  { id: 'covil_do_rei_lich', nome: 'Covil do Rei Lich', desenhar: desenharCovilChefe },
];

function obterCenario(andar) {
  const posicao = ((andar - 1) % 15) + 1; // 1..15, cicla junto com os monstros
  const indiceZona = Math.min(4, Math.floor((posicao - 1) / 3));
  return ZONAS[indiceZona];
}

module.exports = { obterCenario, ZONAS };
