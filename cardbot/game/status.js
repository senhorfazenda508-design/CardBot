// Catálogo de status (bons e ruins) que aparecem em batalha/duelo.
//
// Cada status dura alguns TURNOS de batalha (não segundos reais — cada vez
// que você joga uma carta conta como 1 turno). Os ícones ficam em
// assets/status/<id>.png (mesma lógica de assets/monstros: se o arquivo
// existir o bot desenha ele, se não existir cai pro emoji do catálogo).
//
// run.status é um mapa { [id]: { turnos, valor } } guardado dentro do
// player.run (jogador) ou do objeto do monstro (quando ele mesmo entra em um
// estado, como o Ritual de Adoração ou a Fúria Desesperada).
const STATUS_EFFECTS = {
  veneno:       { nome: 'Envenenado',   emoji: '☠️', tipo: 'dot' },              // dano por turno
  queimadura:   { nome: 'Queimando',    emoji: '🔥', tipo: 'dot' },              // dano por turno (mais forte, dura menos)
  medo:         { nome: 'Amedrontado',  emoji: '😨', tipo: 'sem_critico' },      // zera chance de crítico
  nervoso:      { nome: 'Nervoso',      emoji: '😬', tipo: 'dano_reduzido' },    // -% dano causado
  paralisia:    { nome: 'Paralisado',   emoji: '🦴', tipo: 'chance_falha' },     // chance da carta falhar
  sonolencia:   { nome: 'Sonolento',    emoji: '💤', tipo: 'chance_falha' },     // chance da carta falhar
  fraqueza:     { nome: 'Enfraquecido', emoji: '🤢', tipo: 'cura_reduzida' },    // -% cura recebida
  fadiga:       { nome: 'Fatigado',     emoji: '😩', tipo: 'defesa_reduzida' },  // -% defesa (toma mais dano)
  sufoco:       { nome: 'Sem Ar',       emoji: '🫁', tipo: 'sem_regen' },        // bloqueia regen e reduz escudo ganho
  crise:        { nome: 'Em Crise',     emoji: '💢', tipo: 'escudo_reduzido' },  // derruba parte do escudo atual na hora
};

const VALOR_PADRAO = {
  veneno: 0.05,        // % do hpMax por turno
  queimadura: 0.09,
  nervoso: 0.28,        // -28% de dano causado
  fadiga: 0.25,         // -25% de defesa
  fraqueza: 0.45,       // -45% de cura recebida
  chance_falha: 0.3,    // 30% de chance de a carta falhar naquele turno
  escudo_corte: 0.5,    // crise corta 50% do escudo atual na hora que aplica
};

function aplicarStatus(run, id, turnos, valor = null) {
  if (!STATUS_EFFECTS[id] || turnos <= 0) return null;
  if (!run.status) run.status = {};
  const valorFinal = valor != null ? valor : (VALOR_PADRAO[id] ?? 0);
  const existente = run.status[id];
  // Reaplicar renova a duração e mantém o maior valor (não empilha infinito)
  run.status[id] = {
    turnos: existente ? Math.max(existente.turnos, turnos) : turnos,
    valor: existente ? Math.max(existente.valor, valorFinal) : valorFinal,
  };

  // Crise é instantânea além de deixar o efeito ativo por uns turnos: corta
  // metade do escudo atual na hora que é aplicada.
  if (id === 'crise' && run.escudo > 0) {
    run.escudo = Math.floor(run.escudo * (1 - VALOR_PADRAO.escudo_corte));
  }

  return run.status[id];
}

function statusAtivos(run) {
  if (!run.status) return [];
  return Object.entries(run.status)
    .filter(([, v]) => v.turnos > 0)
    .map(([id, v]) => ({ id, ...STATUS_EFFECTS[id], ...v }));
}

// Chamado no INÍCIO do turno de quem tem os status (antes de agir): aplica
// dano contínuo (veneno/queimadura) e conta a duração pra baixo. Retorna os
// textos prontos pra narração e o dano total sofrido.
function processarStatusInicioTurno(run) {
  const textos = [];
  let danoTotal = 0;
  if (run.status) {
    for (const [id, dados] of Object.entries(run.status)) {
      if (dados.turnos <= 0) continue;
      const info = STATUS_EFFECTS[id];
      if (info.tipo === 'dot' && run.hp > 0) {
        const dano = Math.max(1, Math.round(run.hpMax * dados.valor));
        run.hp = Math.max(0, run.hp - dano);
        danoTotal += dano;
        textos.push(`${info.emoji} **${info.nome}** causou **${dano}** de dano.`);
      }
      dados.turnos -= 1;
      if (dados.turnos <= 0) {
        textos.push(`${info.emoji} O efeito **${info.nome}** passou.`);
        delete run.status[id];
      }
    }
  }
  return { textos, danoTotal };
}

// Agrega todos os status ativos em modificadores prontos pra usar nas
// fórmulas de dano/cura/defesa/escudo/crítico.
function modificadoresStatus(run) {
  const mods = {
    semCritico: false,
    danoMult: 1,
    curaMult: 1,
    defesaMult: 1,       // multiplica a % de defesa (fadiga reduz)
    escudoMult: 1,
    semRegen: false,
    chanceFalhaCarta: 0,
  };
  if (!run.status) return mods;
  for (const [id, dados] of Object.entries(run.status)) {
    if (dados.turnos <= 0) continue;
    const info = STATUS_EFFECTS[id];
    switch (info.tipo) {
      case 'sem_critico': mods.semCritico = true; break;
      case 'dano_reduzido': mods.danoMult *= (1 - dados.valor); break;
      case 'cura_reduzida': mods.curaMult *= (1 - dados.valor); break;
      case 'defesa_reduzida': mods.defesaMult *= (1 - dados.valor); break;
      case 'sem_regen': mods.semRegen = true; mods.escudoMult *= 0.5; break;
      case 'escudo_reduzido': mods.escudoMult *= 0.6; break;
      case 'chance_falha': mods.chanceFalhaCarta = Math.max(mods.chanceFalhaCarta, dados.valor); break;
    }
  }
  return mods;
}

module.exports = {
  STATUS_EFFECTS,
  VALOR_PADRAO,
  aplicarStatus,
  statusAtivos,
  processarStatusInicioTurno,
  modificadoresStatus,
};
