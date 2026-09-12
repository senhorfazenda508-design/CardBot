const { CARDS } = require('./cards');
const { aplicarEncantamento } = require('./enchant');
const { aplicarStatus, modificadoresStatus } = require('./status');

const HP_MAX_BASE_REF = 50; // mesmo valor de HP_MAX_BASE em core/explorar.js, usado só pra calcular o "poder" do jogador

// Multiplicadores fixos dos novos efeitos "únicos" das cartas (ver jogarCarta).
// Ficam centralizados aqui pra ser fácil rebalancear sem caçar números espalhados pelo arquivo.
const EXECUCAO_MULT = 2.2;       // dano da carta "execução" contra alvo abaixo do limiar
const SACRIFICIO_MULT = 2.4;     // dano da carta "sacrifício" (troca vida própria por dano)
const ULTIMO_SUSPIRO_MULT = 2.6; // dano da carta "último suspiro" (você quase morto)

const MONSTROS = [
  { id: 'rato_gigante', nome: 'Rato Gigante' },
  { id: 'goblin_ladrao', nome: 'Goblin Ladrão' },
  { id: 'esqueleto_enferrujado', nome: 'Esqueleto Enferrujado' },
  { id: 'aranha_venenosa', nome: 'Aranha Venenosa' },
  { id: 'lobo_das_sombras', nome: 'Lobo das Sombras' },
  { id: 'bandido_errante', nome: 'Bandido Errante' },
  { id: 'slime_acido', nome: 'Slime Ácido' },
  { id: 'orc_guerreiro', nome: 'Orc Guerreiro' },
  { id: 'espectro_uivante', nome: 'Espectro Uivante' },
  { id: 'golem_de_pedra', nome: 'Golem de Pedra' },
  { id: 'harpia_selvagem', nome: 'Harpia Selvagem' },
  { id: 'necromante_menor', nome: 'Necromante Menor' },
  { id: 'dragao_jovem', nome: 'Dragão Jovem' },
  { id: 'guardiao_ancestral', nome: 'Guardião Ancestral' },
  { id: 'rei_lich', nome: 'Rei Lich' },
];

// "Crie mais bixos com a aparência com a cor mudada apenas": em vez de
// desenhar dezenas de artes novas, cada uma das 15 famílias acima ganha
// variantes de COR sorteadas na hora — a mesma arte/emoji é reaproveitada e
// só recolorida (aplicarTint em game/gui.js), então na prática viram até 6x
// mais "bixos" diferentes sem precisar de nenhum arquivo de imagem novo.
// Cada cor também carrega um elemento, que é o status ruim que aquele
// monstro aplica no jogador quando ataca.
const CORES_VARIANTE = [
  { sufixo: '', tint: null, elemento: null },
  { sufixo: 'Flamejante', tint: '#ff4d3d', elemento: 'fogo' },
  { sufixo: 'Venenoso(a)', tint: '#39d353', elemento: 'veneno' },
  { sufixo: 'Glacial', tint: '#3aa0ff', elemento: 'gelo' },
  { sufixo: 'Sombrio(a)', tint: '#a259ff', elemento: 'sombra' },
  { sufixo: 'Radiante', tint: '#ffd166', elemento: 'sagrado' },
];

// Cada elemento define o status aplicado no jogador quando o monstro ataca
// (exceto "sagrado", que faz o monstro se buffar com um Ritual de Adoração
// em vez de debuffar o jogador).
const ELEMENTOS = {
  fogo: { debuffId: 'queimadura', turnos: 2 },
  veneno: { debuffId: 'veneno', turnos: 4 },
  gelo: { debuffId: 'fadiga', turnos: 3 },
  sombra: { debuffId: 'medo', turnos: 3 },
  sagrado: { ritual: true },
  padrao: { debuffId: 'nervoso', turnos: 2 },
};

// Estima o "poder" do jogador (vida, ataque médio do baralho, defesa da
// armadura, bônus de perks e nível de encantamento médio) pra masmorra
// escalar com o jogador de verdade, não só com o andar — assim ele não fica
// "farmando" andar baixo depois de já estar forte, e os monstros ficam mais
// inteligentes (curam, defendem, esquivam e aplicam status) contra jogadores
// mais poderosos.
function calcularPoderJogador(player, hpMax, defesaArmadura = 0, passivo = {}) {
  const cartas = (player.colecao || []).map(id => CARDS[id]).filter(Boolean);
  const ataqueMedio = cartas.length ? cartas.reduce((s, c) => s + c.ataque, 0) / cartas.length : 5;
  const niveisEncant = player.encantamentos ? Object.values(player.encantamentos) : [];
  const nivelEncantMedio = niveisEncant.length ? niveisEncant.reduce((s, n) => s + n, 0) / niveisEncant.length : 0;

  const poder =
    (hpMax - HP_MAX_BASE_REF) * 0.6 +
    ataqueMedio * 2.2 +
    defesaArmadura * 40 +
    (passivo.danoMult || 0) * 60 +
    (passivo.vidaBonus || 0) * 0.3 +
    nivelEncantMedio * 5;

  return Math.max(0, Math.round(poder));
}

// poderJogador (opcional): ver calcularPoderJogador acima. Se não for
// passado, a masmorra escala só pelo andar (comportamento antigo).
function gerarMonstro(andar, poderJogador = 0) {
  const dificuldadeAndar = 1 + andar * 0.18;
  const fatorPoder = 1 + Math.min(1.6, poderJogador / 220); // teto de +160% pra não ficar impossível
  const dificuldade = dificuldadeAndar * fatorPoder;

  const familia = MONSTROS[Math.min(andar - 1, MONSTROS.length - 1)];
  const elite = andar % 5 === 0; // a cada 5 andares, versão "chefe" recolorida da mesma arte

  // Chefes sempre saem na cor original (o brilho dourado de elite já marca
  // ele); os demais sorteiam entre as variantes coloridas.
  const variante = elite ? CORES_VARIANTE[0] : CORES_VARIANTE[Math.floor(Math.random() * CORES_VARIANTE.length)];
  const nome = variante.sufixo ? `${familia.nome} ${variante.sufixo}` : familia.nome;
  const elementoInfo = ELEMENTOS[variante.elemento] || ELEMENTOS.padrao;

  const hpMax = Math.round((18 + andar * 7) * dificuldade);
  const ataque = Math.round((3 + andar * 1.6) * dificuldade * (0.9 + Math.random() * 0.3));
  const emoji = elite ? '👹' : (andar % 3 === 0 ? '💀' : '👾');

  // "Super inteligência": de 0 (burro, só ataca) a 0.85 (joga muito bem —
  // cura quando está fraco, se defende, esquiva e aplica status ruim com
  // mais frequência). Cresce com o andar E com o poder do jogador.
  const inteligencia = Math.min(0.85, 0.08 + andar * 0.02 + poderJogador / 900);

  return {
    id: familia.id,
    nome,
    hp: hpMax,
    hpMax,
    ataque,
    emoji,
    elite,
    escudo: 0,
    corTint: variante.tint,
    elemento: variante.elemento,
    // --- IA do monstro ---
    inteligencia,
    esquiva: Math.min(0.35, inteligencia * 0.32),          // chance de esquivar de uma carta do jogador
    curaPercent: 0.14 + inteligencia * 0.12,                // % do hpMax curado quando decide se curar
    curaUsos: 0,
    curaUsosMax: andar >= 6 ? 2 : 1,
    escudoDefesaBase: Math.round(hpMax * (0.12 + inteligencia * 0.1)), // escudo ganho quando decide se defender
    debuffId: elementoInfo.debuffId || null,
    debuffTurnos: elementoInfo.turnos || 2,
    ritualAdoracao: Boolean(elementoInfo.ritual),
    buffAdoracaoTurnos: 0,
    furiaDesesperadaAtiva: false,
  };
}

// Puxa uma "mão" de N cartas aleatórias (com repetição) da coleção do jogador.
// Se um mapa de encantamentos for passado, cada carta já sai com seus bônus aplicados.
// encantamentosArcanos (opcional) é o mapa de Selos Arcanos do Mago Aldric.
function comprarMao(colecaoIds, tamanho = 3, encantamentos = null, encantamentosArcanos = null) {
  const mao = [];
  for (let i = 0; i < tamanho; i++) {
    const id = colecaoIds[Math.floor(Math.random() * colecaoIds.length)];
    const base = CARDS[id];
    const nivel = encantamentos ? (encantamentos[id] || 0) : 0;
    const selo = Boolean(encantamentosArcanos && encantamentosArcanos[id]);
    mao.push(nivel > 0 || selo ? aplicarEncantamento(base, nivel, selo) : base);
  }
  return mao;
}

// Resolve o efeito de uma carta jogada pelo jogador contra o monstro (ou, no
// duelo PvP, contra o oponente). defesaAlvo é a % de redução de dano vinda da
// armadura equipada por quem está recebendo o golpe (0 para monstros comuns).
// bonusPassivo (opcional) vem de game/perks.js -> bonusPassivo(player) e traz
// os bônus da perk passiva equipada por quem está atacando.
function jogarCarta(carta, run, monstro, defesaAlvo = 0, bonusPassivo = {}) {
  const statusMods = modificadoresStatus(run);

  // Paralisado/Sonolento: a carta pode falhar por completo naquele turno
  if (statusMods.chanceFalhaCarta > 0 && Math.random() < statusMods.chanceFalhaCarta) {
    return { danoCausado: 0, curaAplicada: 0, escudoGanho: 0, critico: false, esquivado: false, falhou: true };
  }

  let dano = carta.ataque;
  let critico = false;
  let curaAplicada = 0;
  let escudoGanho = 0;
  let esquivado = false;

  // Buff instantâneo de uma perk ativa usada nesse turno (fúria de batalha / golpe certeiro)
  const buff = run.buffProximaCarta;
  if (buff) {
    if (buff.mult) dano = Math.round(dano * buff.mult);
    if (buff.critico) critico = true;
    run.buffProximaCarta = null;
  }

  // Amedrontado: não crita de jeito nenhum nesse turno
  const chanceCritico = statusMods.semCritico
    ? 0
    : (carta.efeito === 'critico' ? carta.valor + (bonusPassivo.critBonus || 0) : (bonusPassivo.critBase || 0));
  if (!critico && chanceCritico > 0 && Math.random() < chanceCritico) {
    dano = Math.round(dano * 2);
    critico = true;
  }

  if (bonusPassivo.danoMult) {
    dano = Math.round(dano * (1 + bonusPassivo.danoMult));
  }

  // Nervoso: reduz o dano causado nesse turno
  if (statusMods.danoMult < 1) {
    dano = Math.max(0, Math.round(dano * statusMods.danoMult));
  }

  // --- Efeitos únicos que alteram o dano ANTES de resolver o golpe ---

  // Execução: dano multiplicado se o alvo já estiver abaixo do limiar de vida (carta.valor, fração 0-1)
  if (carta.efeito === 'execucao' && monstro.hpMax > 0 && (monstro.hp / monstro.hpMax) <= carta.valor) {
    dano = Math.round(dano * EXECUCAO_MULT);
  }

  // Ceifador: quanto mais perto da morte estiver o alvo, mais dano bônus (contínuo, não é um "tudo ou nada" como a execução)
  if (carta.efeito === 'ceifador' && monstro.hpMax > 0) {
    const vidaRestanteFrac = Math.max(0, Math.min(1, monstro.hp / monstro.hpMax));
    dano = Math.round(dano * (1 + (1 - vidaRestanteFrac) * carta.valor));
  }

  // Vingança: quanto mais machucado VOCÊ estiver, mais forte o golpe sai
  if (carta.efeito === 'vinganca' && run.hpMax > 0) {
    const vidaPerdidaFrac = Math.max(0, Math.min(1, 1 - run.hp / run.hpMax));
    dano = Math.round(dano * (1 + vidaPerdidaFrac * carta.valor));
  }

  // Último Suspiro: se sua vida estiver abaixo do limiar (carta.valor), o golpe sai multiplicado — a carta da virada dramática
  if (carta.efeito === 'ultimo_suspiro' && run.hpMax > 0 && (run.hp / run.hpMax) <= carta.valor) {
    dano = Math.round(dano * ULTIMO_SUSPIRO_MULT);
  }

  // Sacrifício: você abre mão de parte da própria vida ATUAL (carta.valor, fração) pra causar dano bem maior
  if (carta.efeito === 'sacrificio' && run.hp > 1) {
    const custo = Math.max(1, Math.min(run.hp - 1, Math.round(run.hp * carta.valor)));
    run.hp -= custo;
    dano = Math.round(dano * SACRIFICIO_MULT);
  }

  // Sorte: cada jogada sorteia um bônus diferente (crítico automático, cura ou escudo) — imprevisível por design
  if (carta.efeito === 'sorte') {
    const sorteio = Math.random();
    if (sorteio < 0.34) {
      dano = Math.round(dano * 2);
      critico = true;
    } else if (sorteio < 0.67) {
      const cura = Math.max(0, Math.round(carta.valor * statusMods.curaMult));
      curaAplicada += cura;
      run.hp = Math.min(run.hpMax, run.hp + cura);
    } else {
      const escudoSorte = Math.max(0, Math.round(carta.valor * statusMods.escudoMult));
      escudoGanho += escudoSorte;
      run.escudo = (run.escudo || 0) + escudoSorte;
    }
  }

  if (carta.efeito === 'cura') {
    const cura = Math.max(0, Math.round(carta.valor * statusMods.curaMult));
    curaAplicada += cura;
    run.hp = Math.min(run.hpMax, run.hp + cura);
  }

  if (carta.efeito === 'roubo') {
    const vidaRoubada = Math.max(0, Math.round(dano * carta.valor * statusMods.curaMult));
    curaAplicada += vidaRoubada;
    run.hp = Math.min(run.hpMax, run.hp + vidaRoubada);
  }

  if (carta.efeito === 'escudo') {
    escudoGanho = Math.max(0, Math.round(carta.valor * statusMods.escudoMult));
    run.escudo = (run.escudo || 0) + escudoGanho;
  }

  // Cura Percentual: cura baseada numa fração do SEU HP MÁXIMO (carta.valor), não um valor fixo — escala com o jogador
  if (carta.efeito === 'cura_percentual') {
    const cura = Math.max(0, Math.round(run.hpMax * carta.valor * statusMods.curaMult));
    curaAplicada += cura;
    run.hp = Math.min(run.hpMax, run.hp + cura);
  }

  // Roubo Blindado: como o roubo normal, mas metade do valor vira escudo em vez de cura
  if (carta.efeito === 'roubo_blindado') {
    const total = Math.max(0, Math.round(dano * carta.valor * statusMods.curaMult));
    const parteCura = Math.floor(total / 2);
    const parteEscudo = total - parteCura;
    curaAplicada += parteCura;
    run.hp = Math.min(run.hpMax, run.hp + parteCura);
    escudoGanho += Math.max(0, Math.round(parteEscudo * statusMods.escudoMult));
    run.escudo = (run.escudo || 0) + Math.max(0, Math.round(parteEscudo * statusMods.escudoMult));
  }

  if (defesaAlvo > 0) {
    dano = Math.max(0, Math.round(dano * (1 - defesaAlvo)));
  }

  // Brecha: ignora completamente o escudo do alvo nesse golpe (mas ainda pode ser esquivado)
  const ignorarEscudoAlvo = carta.efeito === 'brecha';

  // Investida Dupla: acerta duas vezes na mesma jogada — o segundo golpe causa uma fração
  // (carta.valor) do dano do primeiro, e cada golpe tem sua própria chance de ser esquivado/bloqueado
  const golpes = carta.efeito === 'investida_dupla' ? 2 : 1;
  let danoTotalCausado = 0;
  let algumGolpeAcertou = false;

  for (let i = 0; i < golpes; i++) {
    let danoDesseGolpe = i === 0 ? dano : Math.round(dano * carta.valor);

    // "Super inteligência": monstros mais inteligentes podem esquivar por completo do golpe
    let esquivadoDesseGolpe = false;
    if (danoDesseGolpe > 0 && monstro.esquiva && Math.random() < monstro.esquiva) {
      esquivadoDesseGolpe = true;
      danoDesseGolpe = 0;
    }

    if (!esquivadoDesseGolpe && !ignorarEscudoAlvo && monstro.escudo > 0) {
      const bloqueado = Math.min(monstro.escudo, danoDesseGolpe);
      danoDesseGolpe -= bloqueado;
      monstro.escudo -= bloqueado;
    }

    monstro.hp = Math.max(0, monstro.hp - danoDesseGolpe);
    danoTotalCausado += danoDesseGolpe;
    if (!esquivadoDesseGolpe) algumGolpeAcertou = true;
  }

  dano = danoTotalCausado;
  esquivado = !algumGolpeAcertou; // só conta como "esquivado" de fato se NENHUM golpe acertou

  // Vampirismo (perk passiva): cura uma % do dano final causado, além de qualquer
  // cura/roubo que a própria carta já tenha gerado.
  if (bonusPassivo.vampiroPercent && dano > 0) {
    const vidaVampiro = Math.max(0, Math.round(dano * bonusPassivo.vampiroPercent * statusMods.curaMult));
    if (vidaVampiro > 0) {
      curaAplicada += vidaVampiro;
      run.hp = Math.min(run.hpMax, run.hp + vidaVampiro);
    }
  }

  return { danoCausado: dano, curaAplicada, escudoGanho, critico, esquivado, falhou: false };
}

// Resolve o turno do monstro com a IA nova: em vez de só atacar sempre, ele
// pode se CURAR (quando está fraco e ainda tem usos), se DEFENDER (abre mão
// do ataque pra ganhar escudo), conduzir um RITUAL DE ADORAÇÃO (só os
// "Radiantes" — buff de ataque/escudo por alguns turnos), entrar em FÚRIA
// DESESPERADA (uma vez, quando está quase morto e sem mais curas — ataca bem
// mais forte mas se machuca a cada golpe) ou ATACAR normalmente e, com uma
// chance baseada na inteligência, aplicar o status ruim do seu elemento no
// jogador por alguns turnos.
function turnoMonstro(run, monstro, defesaArmadura = 0, defesaPassiva = 0) {
  const resultado = { tipo: 'ataque', texto: '', dano: 0, curaMonstro: 0, escudoGanho: 0, statusAplicado: null };
  if (run.hp <= 0 || monstro.hp <= 0) return resultado;

  const hpFrac = monstro.hp / monstro.hpMax;

  // 1) Curar quando está fraco
  if (hpFrac <= 0.4 && monstro.curaUsos < monstro.curaUsosMax && Math.random() < (0.25 + monstro.inteligencia * 0.5)) {
    const cura = Math.round(monstro.hpMax * monstro.curaPercent);
    const antes = monstro.hp;
    monstro.hp = Math.min(monstro.hpMax, monstro.hp + cura);
    monstro.curaUsos += 1;
    resultado.tipo = 'cura';
    resultado.curaMonstro = monstro.hp - antes;
    resultado.texto = `💚 **${monstro.nome}** se cura em **${resultado.curaMonstro}** de vida!`;
    return resultado;
  }

  // 2) Fúria Desesperada: só entra 1x, quase morto e sem mais curas disponíveis
  let entrouEmFuria = false;
  if (hpFrac <= 0.25 && !monstro.furiaDesesperadaAtiva && monstro.curaUsos >= monstro.curaUsosMax) {
    monstro.furiaDesesperadaAtiva = true;
    entrouEmFuria = true;
  }

  // 3) Ritual de Adoração (só variante "Radiante") — buff de ataque/escudo por 3 turnos
  if (!entrouEmFuria && monstro.ritualAdoracao && monstro.buffAdoracaoTurnos <= 0 && Math.random() < monstro.inteligencia * 0.4) {
    monstro.buffAdoracaoTurnos = 3;
    monstro.escudo = (monstro.escudo || 0) + monstro.escudoDefesaBase;
    resultado.tipo = 'ritual';
    resultado.escudoGanho = monstro.escudoDefesaBase;
    resultado.texto = `🙏 **${monstro.nome}** conduz um Ritual de Adoração — ganha **${monstro.escudoDefesaBase}** de escudo e ataca mais forte por alguns turnos!`;
    return resultado;
  }

  // 4) Defender: abre mão do ataque pra ganhar escudo
  if (!entrouEmFuria && Math.random() < monstro.inteligencia * 0.3) {
    monstro.escudo = (monstro.escudo || 0) + monstro.escudoDefesaBase;
    resultado.tipo = 'defesa';
    resultado.escudoGanho = monstro.escudoDefesaBase;
    resultado.texto = `🛡️ **${monstro.nome}** se defende e ganha **${monstro.escudoDefesaBase}** de escudo.`;
    return resultado;
  }

  // 5) Ataque normal (com bônus de fúria/ritual, se ativos)
  let dano = monstro.ataque + Math.round(Math.random() * 3) - 1;
  if (monstro.furiaDesesperadaAtiva) dano = Math.round(dano * 1.5);
  if (monstro.buffAdoracaoTurnos > 0) dano = Math.round(dano * 1.25);
  dano = Math.max(1, dano);

  const defesaTotal = Math.min(0.9, defesaArmadura + defesaPassiva);
  if (defesaTotal > 0) {
    dano = Math.max(1, Math.round(dano * (1 - defesaTotal)));
  }
  if (run.escudo > 0) {
    const bloqueado = Math.min(run.escudo, dano);
    dano -= bloqueado;
    run.escudo -= bloqueado;
  }
  run.hp = Math.max(0, run.hp - dano);
  resultado.dano = dano;
  resultado.texto = entrouEmFuria
    ? `😤 **${monstro.nome}** entra em fúria desesperada e ataca com **${dano}** de dano!`
    : `**${monstro.nome}** ataca e causa **${dano}** de dano.`;

  // Recuo da Fúria Desesperada: o próprio monstro se machuca ao atacar assim
  if (monstro.furiaDesesperadaAtiva) {
    const recuo = Math.max(1, Math.round(monstro.hpMax * 0.05));
    monstro.hp = Math.max(0, monstro.hp - recuo);
    resultado.texto += ` (e se machuca em **${recuo}** com a própria fúria)`;
  }

  // Chance de aplicar o status ruim do elemento do monstro no jogador
  if (monstro.debuffId && Math.random() < (0.3 + monstro.inteligencia * 0.35)) {
    aplicarStatus(run, monstro.debuffId, monstro.debuffTurnos);
    resultado.statusAplicado = monstro.debuffId;
  }

  if (monstro.buffAdoracaoTurnos > 0) monstro.buffAdoracaoTurnos -= 1;

  return resultado;
}

// Mantido por compatibilidade: mesma assinatura de antes, mas por baixo já
// usa a IA nova de turnoMonstro (só devolve o número de dano causado).
function atacarMonstro(run, monstro, defesaArmadura = 0, defesaPassiva = 0) {
  return turnoMonstro(run, monstro, defesaArmadura, defesaPassiva).dano;
}

// Aplica a regeneração passiva no início do turno de quem tem a perk equipada.
// "Sem Ar" bloqueia completamente a regeneração enquanto estiver ativo.
// Retorna quanto foi curado (0 se nada).
function aplicarRegeneracaoTurno(run, bonusPassivo = {}) {
  if (!bonusPassivo.regenPorTurno || run.hp <= 0) return 0;
  if (modificadoresStatus(run).semRegen) return 0;
  const antes = run.hp;
  run.hp = Math.min(run.hpMax, run.hp + bonusPassivo.regenPorTurno);
  return run.hp - antes;
}

// Resolve o uso de uma perk ATIVA (não gasta o turno). `run` é o estado de vida
// de quem está usando (player.run ou estado.a/estado.b do duelo), `alvo` é o
// monstro ou o oponente (precisa ter .hp e .hpMax).
function usarPerkAtiva(perk, run, alvo) {
  const resultado = { texto: '', danoCausado: 0, curaAplicada: 0, escudoGanho: 0 };

  switch (perk.efeito) {
    case 'cura_instantanea': {
      const cura = Math.round(run.hpMax * perk.valor);
      const antes = run.hp;
      run.hp = Math.min(run.hpMax, run.hp + cura);
      resultado.curaAplicada = run.hp - antes;
      resultado.texto = `usou **${perk.nome}** e recuperou **${resultado.curaAplicada}** de vida instantaneamente!`;
      break;
    }
    case 'dobro_dano': {
      run.buffProximaCarta = { mult: 2, critico: false };
      resultado.texto = `usou **${perk.nome}**! A próxima carta jogada vai causar o dobro de dano.`;
      break;
    }
    case 'golpe_certeiro': {
      run.buffProximaCarta = { mult: 1, critico: true };
      resultado.texto = `usou **${perk.nome}**! A próxima carta jogada será garantidamente crítica.`;
      break;
    }
    case 'escudo_grande': {
      run.escudo = (run.escudo || 0) + perk.valor;
      resultado.escudoGanho = perk.valor;
      resultado.texto = `usou **${perk.nome}** e ganhou **${perk.valor}** de escudo instantaneamente!`;
      break;
    }
    case 'roubo_instantaneo': {
      if (alvo) {
        const dano = Math.min(alvo.hp, perk.valor);
        alvo.hp = Math.max(0, alvo.hp - perk.valor);
        resultado.danoCausado = dano;
      }
      const antes = run.hp;
      run.hp = Math.min(run.hpMax, run.hp + perk.valor);
      resultado.curaAplicada = run.hp - antes;
      resultado.texto = `usou **${perk.nome}** e roubou **${perk.valor}** de vida do oponente!`;
      break;
    }
    default:
      resultado.texto = `usou **${perk.nome}**.`;
  }

  return resultado;
}

function recompensaMoedas(andar) {
  return Math.round(15 + andar * 6 + Math.random() * 10);
}

module.exports = {
  gerarMonstro,
  calcularPoderJogador,
  comprarMao,
  jogarCarta,
  atacarMonstro,
  turnoMonstro,
  aplicarRegeneracaoTurno,
  usarPerkAtiva,
  recompensaMoedas,
};
