const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { gerarMonstro, calcularPoderJogador, comprarMao, jogarCarta, turnoMonstro, aplicarRegeneracaoTurno, usarPerkAtiva, recompensaMoedas } = require('../game/battle');
const { renderEncontro, renderBatalha } = require('../game/gui');
const { bonusEquipamento } = require('../game/armor');
const { bonusPassivo, perkAtivaEquipada } = require('../game/perks');
const { RECURSOS_INFO, SAQUE_MASMORRA, sortearRecursoMasmorra } = require('../game/city');
const { processarStatusInicioTurno, statusAtivos } = require('../game/status');

const HP_MAX_BASE = 50;

function montarBotoesMao(mao, perkAtiva, perkUsada) {
  const row = new ActionRowBuilder();
  mao.forEach((carta, idx) => {
    const estrela = carta.nivelEncantamento ? ` +${carta.nivelEncantamento}` : '';
    const selo = carta.seloArcano ? ' 🔮' : '';
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`carta_${idx}`)
        .setLabel(`${carta.nome}${estrela}${selo} (ATQ ${carta.ataque})`)
        .setStyle(ButtonStyle.Secondary)
    );
  });
  const linhas = [row];
  if (perkAtiva && !perkUsada) {
    const rowPerk = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('usar_perk_ativa')
        .setLabel(`Usar ${perkAtiva.nome}`)
        .setEmoji(perkAtiva.emoji)
        .setStyle(ButtonStyle.Success)
    );
    linhas.push(rowPerk);
  }
  return linhas;
}

const ANDAR_MINIMO_VULTO = 2;
const CHANCE_VULTO = 0.12;
const CUSTO_AJUDAR_VULTO = 20;
const ANDAR_MINIMO_FRAGMENTO = 4;
const CHANCE_FRAGMENTO = 0.1;

// Encontro especial de masmorra: em vez de um monstro, o jogador pode achar
// Vulto, um NPC preso na masmorra. Substitui a luta daquele andar.
async function tentarEncontroVulto(ctx, player) {
  const embed = new EmbedBuilder()
    .setColor(0x8a5fd6)
    .setTitle('👻 Um vulto entre as sombras...')
    .setDescription(
      `No andar ${player.run.andar}, no lugar de um monstro, você encontra **Vulto**, um espírito preso nas correntes da masmorra há eras.\n\n` +
      `*"Viajante... liberte-me de mais um elo dessas correntes, e eu lhe darei algo que carrego há séculos."*\n\n` +
      (player.run.moedasRun >= CUSTO_AJUDAR_VULTO
        ? `Ele pede **${CUSTO_AJUDAR_VULTO}** moedas da sua run atual como oferenda.`
        : `Você não tem moedas suficientes na run atual (precisa de ${CUSTO_AJUDAR_VULTO}) para ajudá-lo.`)
    )
    .setFooter({ text: `Moedas na run: ${player.run.moedasRun}` });

  const linha = new ActionRowBuilder();
  if (player.run.moedasRun >= CUSTO_AJUDAR_VULTO) {
    linha.addComponents(
      new ButtonBuilder().setCustomId('vulto_ajudar').setLabel(`Ajudar (-${CUSTO_AJUDAR_VULTO} moedas)`).setEmoji('🕯️').setStyle(ButtonStyle.Success)
    );
  }
  linha.addComponents(new ButtonBuilder().setCustomId('vulto_ignorar').setLabel('Seguir em frente').setStyle(ButtonStyle.Secondary));

  const msg = await ctx.send({ embeds: [embed], components: [linha] });

  let clique;
  try {
    clique = await msg.awaitMessageComponent({ filter: i => i.user.id === ctx.userId, time: 30_000 });
  } catch {
    try { await msg.edit({ components: [] }); } catch {}
    return;
  }

  if (clique.customId === 'vulto_ajudar') {
    player.run.moedasRun -= CUSTO_AJUDAR_VULTO;
    const ganhouFragmento = Math.random() < 0.5;
    let recompensaTexto;
    if (ganhouFragmento) {
      player.fragmentosArcanos = (player.fragmentosArcanos || 0) + 1;
      recompensaTexto = 'Um **Fragmento Arcano** 🔮 se materializa em sua mão — o Mago Aldric, na vila, certamente saberá o que fazer com ele. Use `/mago` ou `;mago`.';
    } else {
      const bonus = 40 + player.run.andar * 5;
      player.run.moedasRun += bonus;
      recompensaTexto = `Vulto sorri e um punhado de moedas antigas aparece do nada: **+${bonus}** moedas na run.`;
    }
    savePlayer(ctx.userId, player);

    const embedSucesso = new EmbedBuilder()
      .setColor(0x43b581)
      .setTitle('✨ Vulto agradece e desaparece...')
      .setDescription(recompensaTexto)
      .setFooter({ text: 'Use /explorar (ou ;adv) novamente para continuar avançando na masmorra.' });
    await clique.update({ embeds: [embedSucesso], components: [] });
  } else {
    savePlayer(ctx.userId, player);
    await clique.update({ content: 'Você segue em frente, deixando Vulto para trás nas sombras...', embeds: [], components: [] });
  }
}

// Gera só a imagem da cena (sem nenhum texto desenhado dentro) — a narração vira mensagem normal do Discord
async function renderizarCenaBatalha(player, avatarURL, monstro) {
  const buffer = await renderBatalha(player, avatarURL, monstro);
  const nomeArquivo = `batalha_${Date.now()}.png`;
  return {
    nomeArquivo,
    files: [new AttachmentBuilder(buffer, { name: nomeArquivo })],
    imagemUrl: `attachment://${nomeArquivo}`,
  };
}

async function explorarCore(ctx) {
  let player = getPlayer(ctx.userId, ctx.username);
  const { defesa: defesaArmadura, vida: vidaArmadura, armadura } = bonusEquipamento(player);
  const passivo = bonusPassivo(player);
  const perkAtiva = perkAtivaEquipada(player);
  const hpMaxComEquipamento = HP_MAX_BASE + vidaArmadura + (passivo.vidaBonus || 0);

  if (!player.run.ativa) {
    player.run = { ativa: true, andar: 1, hp: hpMaxComEquipamento, hpMax: hpMaxComEquipamento, escudo: 0, moedasRun: 0, status: {} };
  } else {
    player.run.andar += 1;
    player.run.escudo = 0;
    player.run.hpMax = hpMaxComEquipamento;
    player.run.hp = Math.min(player.run.hp, hpMaxComEquipamento);
    player.run.status = {}; // status ruins não atravessam pro próximo andar
  }
  // Reset por andar/batalha: buff de perk ativa e o "usada" de cada nova luta
  player.run.buffProximaCarta = null;
  player.run.perkAtivaUsada = false;
  savePlayer(ctx.userId, player);

  if (player.run.andar >= ANDAR_MINIMO_VULTO && Math.random() < CHANCE_VULTO) {
    await tentarEncontroVulto(ctx, player);
    return;
  }

  // A masmorra escala com o PODER do jogador (vida, ataque médio do baralho,
  // defesa, perks, encantamentos), não só com o andar — monstros ficam mais
  // fortes e mais "inteligentes" contra quem já está mais forte.
  const poderJogador = calcularPoderJogador(player, hpMaxComEquipamento, defesaArmadura, passivo);
  const monstro = gerarMonstro(player.run.andar, poderJogador);

  // Tela de encontro (aparece antes de mostrar as cartas)
  const bufferEncontro = await renderEncontro(monstro, player.run.andar);
  const nomeEncontro = `encontro_${Date.now()}.png`;
  const attachmentEncontro = new AttachmentBuilder(bufferEncontro, { name: nomeEncontro });

  let mao = comprarMao(player.colecao, 3, player.encantamentos, player.encantamentosArcanos);
  let msg = await ctx.send({
    content: `Um(a) **${monstro.nome}** apareceu no andar ${player.run.andar}!`,
    files: [attachmentEncontro],
    embeds: [new EmbedBuilder().setColor(0xed4245).setImage(`attachment://${nomeEncontro}`)],
    components: montarBotoesMao(mao, perkAtiva, player.run.perkAtivaUsada),
  });

  while (true) {
    let clique;
    try {
      clique = await msg.awaitMessageComponent({
        filter: i => i.user.id === ctx.userId,
        time: 45_000,
      });
    } catch {
      player.run.ativa = false;
      savePlayer(ctx.userId, player);
      await ctx.followUp({ content: '⏳ Tempo esgotado! Você fugiu da masmorra e a run foi encerrada.' });
      try { await msg.edit({ components: [] }); } catch {}
      return;
    }

    // Uso de perk ativa: não gasta o turno, não gera contra-ataque do monstro
    if (clique.customId === 'usar_perk_ativa') {
      if (!perkAtiva || player.run.perkAtivaUsada) {
        await clique.reply({ content: 'Essa perk não está mais disponível.', ephemeral: true });
        continue;
      }
      await clique.deferUpdate();

      const resultadoPerk = usarPerkAtiva(perkAtiva, player.run, monstro);
      player.run.perkAtivaUsada = true;
      savePlayer(ctx.userId, player);

      const cenaPerk = await renderizarCenaBatalha(player, ctx.avatarURL, monstro);
      const embedPerk = new EmbedBuilder()
        .setColor(0xc04af0)
        .setImage(cenaPerk.imagemUrl)
        .setDescription(`Você ${resultadoPerk.texto}`);
      await clique.editReply({ content: null, files: cenaPerk.files, embeds: [embedPerk], components: montarBotoesMao(mao, perkAtiva, player.run.perkAtivaUsada) });
      continue;
    }

    const idx = parseInt(clique.customId.split('_')[1], 10);
    const cartaEscolhida = mao[idx];
    if (!cartaEscolhida) continue;

    await clique.deferUpdate(); // confirma o clique na hora; a imagem pode demorar um pouco mais que 3s

    // Status ruins ativos (veneno/queimadura etc.) batem no início do seu turno
    const statusInicio = processarStatusInicioTurno(player.run);
    let texto = statusInicio.textos.length ? statusInicio.textos.join(' ') + ' ' : '';

    // Jogador pode ter morrido pro dano contínuo antes mesmo de jogar a carta
    if (player.run.hp <= 0) {
      const perdidas = player.run.moedasRun;
      player.estatisticas.derrotas += 1;
      player.run = { ativa: false, andar: 0, hp: 0, hpMax: 0, escudo: 0, moedasRun: 0, status: {} };
      savePlayer(ctx.userId, player);
      const embedDerrotaStatus = new EmbedBuilder()
        .setColor(0x2f3136)
        .setTitle('💀 Você caiu na masmorra...')
        .setDescription(`${texto}\n\nVocê perdeu **${perdidas}** moedas que não haviam sido recolhidas.\nUse \`/explorar\` ou \`;adv\` para começar uma nova jornada do zero.`);
      await clique.editReply({ content: null, embeds: [embedDerrotaStatus], components: [], files: [] });
      return;
    }

    // Regeneração passiva no início do seu turno (bloqueada se estiver "Sem Ar")
    const curaRegen = aplicarRegeneracaoTurno(player.run, passivo);
    if (curaRegen > 0) texto += `Sua regeneração curou **${curaRegen}** de vida. `;

    const resultadoJogador = jogarCarta(cartaEscolhida, player.run, monstro, 0, passivo);
    if (resultadoJogador.falhou) {
      texto += `Você tentou jogar **${cartaEscolhida.nome}**, mas seu estado não deixou — a carta falhou!`;
    } else if (resultadoJogador.esquivado) {
      texto += `Você jogou **${cartaEscolhida.nome}**, mas **${monstro.nome}** esquivou do golpe!`;
    } else {
      texto += `Você jogou **${cartaEscolhida.nome}** e causou **${resultadoJogador.danoCausado}** de dano${resultadoJogador.critico ? ' — CRÍTICO! 💥' : ''}.`;
      if (resultadoJogador.curaAplicada > 0) texto += ` Recuperou **${resultadoJogador.curaAplicada}** de vida.`;
      if (resultadoJogador.escudoGanho > 0) texto += ` Ganhou **${resultadoJogador.escudoGanho}** de escudo.`;
    }

    // Monstro derrotado
    if (monstro.hp <= 0) {
      const ganho = recompensaMoedas(player.run.andar);
      player.run.moedasRun += ganho;
      player.run.hp = Math.min(player.run.hpMax, player.run.hp + Math.round(player.run.hpMax * 0.15));
      player.estatisticas.vitorias += 1;
      player.estatisticas.maiorAndar = Math.max(player.estatisticas.maiorAndar, player.run.andar);

      let fragmentoTexto = '';
      if (player.run.andar >= ANDAR_MINIMO_FRAGMENTO && Math.random() < CHANCE_FRAGMENTO) {
        player.fragmentosArcanos = (player.fragmentosArcanos || 0) + 1;
        fragmentoTexto = '\n\n🔮 Entre os destroços, você encontra um **Fragmento Arcano**! Leve-o até o Mago Aldric (`/mago` ou `;mago`) para selar uma carta.';
      }

      // Saque de recursos brutos (madeira/pedra/comida/ouro) — não exige
      // cidade fundada, os recursos ficam guardados em player.cidade.recursos
      // esperando o dia em que o jogador decidir fundar (ver game/city.js).
      let saqueTexto = '';
      if (Math.random() < SAQUE_MASMORRA.chance) {
        const { recurso, quantidade } = sortearRecursoMasmorra(player.run.andar);
        if (!player.cidade.recursos) player.cidade.recursos = { madeira: 0, pedra: 0, comida: 0, ouro: 0 };
        player.cidade.recursos[recurso] = (player.cidade.recursos[recurso] || 0) + quantidade;
        saqueTexto = `\n\n${RECURSOS_INFO[recurso].emoji} Entre os destroços, você recolhe **${quantidade} de ${RECURSOS_INFO[recurso].nome}** — fica guardado pra quando você fundar (ou continuar) sua cidade com \`/cidade\`, mesmo sem ter fundado ainda.`;
      }
      savePlayer(ctx.userId, player);

      const cena = await renderizarCenaBatalha(player, ctx.avatarURL, monstro);
      const embedVitoria = new EmbedBuilder()
        .setColor(0x43b581)
        .setTitle(`🏆 ${monstro.nome} derrotado!`)
        .setImage(cena.imagemUrl)
        .setDescription(`${texto} **${monstro.nome}** foi derrotado!\n\nVocê ganhou **${ganho}** moedas nesta batalha.\nUse \`/explorar\` (ou \`;adv\`) para ir ao andar ${player.run.andar + 1}, ou \`/recolher\` (ou \`;recolher\`) para guardar as moedas com segurança.${fragmentoTexto}${saqueTexto}`)
        .setFooter({ text: `Moedas acumuladas na run: ${player.run.moedasRun} · Vida: ${player.run.hp}/${player.run.hpMax}` });

      await clique.editReply({ content: null, files: cena.files, embeds: [embedVitoria], components: [] });
      return;
    }

    // Turno do monstro: agora com IA — pode curar, se defender, fazer um
    // Ritual de Adoração, entrar em fúria desesperada ou atacar de verdade
    // (e, ao atacar, tem chance de aplicar o status ruim do seu elemento).
    const turnoIA = turnoMonstro(player.run, monstro, defesaArmadura, passivo.defesaBonus || 0);
    texto += ` ${turnoIA.texto}`;
    if (turnoIA.statusAplicado) {
      texto += ` Você ficou **${statusAtivos(player.run).find(s => s.id === turnoIA.statusAplicado)?.nome || 'afetado'}**!`;
    }

    // Perk "Último Fôlego": salva o jogador de um golpe fatal, 1x por batalha
    if (player.run.hp <= 0 && passivo.ultimoFolego && !player.run.ultimoFolegoUsado) {
      player.run.hp = 1;
      player.run.ultimoFolegoUsado = true;
      texto += ` ✨ **Último Fôlego** ativou e te salvou com 1 de vida!`;
    }
    savePlayer(ctx.userId, player);

    // Jogador derrotado
    if (player.run.hp <= 0) {
      const perdidas = player.run.moedasRun;
      player.estatisticas.derrotas += 1;
      player.run = { ativa: false, andar: 0, hp: 0, hpMax: 0, escudo: 0, moedasRun: 0, status: {} };
      savePlayer(ctx.userId, player);

      const embedDerrota = new EmbedBuilder()
        .setColor(0x2f3136)
        .setTitle('💀 Você caiu na masmorra...')
        .setDescription(`${texto}\n\nVocê perdeu **${perdidas}** moedas que não haviam sido recolhidas.\nUse \`/explorar\` ou \`;adv\` para começar uma nova jornada do zero.`);

      await clique.editReply({ content: null, embeds: [embedDerrota], components: [], files: [] });
      return;
    }

    // Continua a batalha: nova mão e nova imagem
    mao = comprarMao(player.colecao, 3, player.encantamentos, player.encantamentosArcanos);
    const cena = await renderizarCenaBatalha(player, ctx.avatarURL, monstro);
    const embedTurno = new EmbedBuilder().setColor(0xed4245).setImage(cena.imagemUrl).setDescription(texto);
    const statusTexto = statusAtivos(player.run).map(s => `${s.emoji} ${s.nome} (${s.turnos})`).join(' · ');
    if (statusTexto) embedTurno.setFooter({ text: statusTexto });
    await clique.editReply({ content: null, files: cena.files, embeds: [embedTurno], components: montarBotoesMao(mao, perkAtiva, player.run.perkAtivaUsada) });
  }
}

module.exports = explorarCore;
