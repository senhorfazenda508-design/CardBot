const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { comprarMao, jogarCarta, aplicarRegeneracaoTurno, usarPerkAtiva } = require('../game/battle');
const { renderDuelo } = require('../game/gui');
const { bonusEquipamento } = require('../game/armor');
const { bonusPassivo, perkAtivaEquipada } = require('../game/perks');

const HP_DUELO = 40;
const PREMIO_VENCEDOR = 40;
const PREMIO_PERDEDOR = 10;

function montarBotoesMao(mao, ladoDaVez) {
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
  if (ladoDaVez.perkAtiva && !ladoDaVez.perkAtivaUsada) {
    const rowPerk = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('usar_perk_ativa')
        .setLabel(`Usar ${ladoDaVez.perkAtiva.nome}`)
        .setEmoji(ladoDaVez.perkAtiva.emoji)
        .setStyle(ButtonStyle.Success)
    );
    linhas.push(rowPerk);
  }
  return linhas;
}

// Gera só a imagem da cena (sem texto desenhado dentro) — a narração vira mensagem normal do Discord
async function renderizarCenaDuelo(estado) {
  const buffer = await renderDuelo({
    nomeA: estado.a.username, avatarA: estado.a.avatarURL, hpA: estado.a.hp, hpMaxA: estado.a.hpMax, escudoA: estado.a.escudo,
    nomeB: estado.b.username, avatarB: estado.b.avatarURL, hpB: estado.b.hp, hpMaxB: estado.b.hpMax, escudoB: estado.b.escudo,
    turnoNome: estado.turno.username,
  });
  const nomeArquivo = `duelo_${Date.now()}.png`;
  return {
    nomeArquivo,
    files: [new AttachmentBuilder(buffer, { name: nomeArquivo })],
    imagemUrl: `attachment://${nomeArquivo}`,
  };
}

async function duelCore(ctx, alvoUser) {
  if (!alvoUser) {
    await ctx.send({ content: 'Mencione quem você quer desafiar. Ex: `;duelo @pessoa`' });
    return;
  }
  if (alvoUser.id === ctx.userId) {
    await ctx.send({ content: 'Você não pode duelar contra si mesmo 🙂' });
    return;
  }
  if (alvoUser.bot) {
    await ctx.send({ content: 'Não dá pra duelar contra um bot!' });
    return;
  }

  const desafioEmbed = new EmbedBuilder()
    .setColor(0xc04af0)
    .setTitle('⚔️ Desafio de duelo!')
    .setDescription(`<@${ctx.userId}> desafiou <@${alvoUser.id}> para um duelo!\n<@${alvoUser.id}>, você aceita?`);

  const linhaBotoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('aceitar').setLabel('Aceitar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('recusar').setLabel('Recusar').setStyle(ButtonStyle.Danger),
  );

  const msgDesafio = await ctx.send({ embeds: [desafioEmbed], components: [linhaBotoes] });

  let resposta;
  try {
    resposta = await msgDesafio.awaitMessageComponent({
      filter: i => i.user.id === alvoUser.id,
      time: 30_000,
    });
  } catch {
    await ctx.followUp({ content: `⌛ <@${alvoUser.id}> não respondeu a tempo. Duelo cancelado.` });
    try { await msgDesafio.edit({ components: [] }); } catch {}
    return;
  }

  if (resposta.customId === 'recusar') {
    await resposta.update({ content: `${alvoUser.username} recusou o duelo.`, embeds: [], components: [] });
    return;
  }

  // --- Duelo aceito: monta o estado inicial (já considerando armadura e perks equipadas de cada um) ---
  const jogadorA0 = getPlayer(ctx.userId, ctx.username);
  const jogadorB0 = getPlayer(alvoUser.id, alvoUser.username);
  const equipA = bonusEquipamento(jogadorA0);
  const equipB = bonusEquipamento(jogadorB0);
  const passivoA = bonusPassivo(jogadorA0);
  const passivoB = bonusPassivo(jogadorB0);
  const hpMaxA = HP_DUELO + equipA.vida + (passivoA.vidaBonus || 0);
  const hpMaxB = HP_DUELO + equipB.vida + (passivoB.vidaBonus || 0);

  const estado = {
    a: {
      id: ctx.userId, username: ctx.username, avatarURL: ctx.avatarURL, hp: hpMaxA, hpMax: hpMaxA, escudo: 0,
      defesa: (equipA.defesa || 0) + (passivoA.defesaBonus || 0), passivo: passivoA,
      perkAtiva: perkAtivaEquipada(jogadorA0), perkAtivaUsada: false, ultimoFolegoUsado: false,
    },
    b: {
      id: alvoUser.id, username: alvoUser.username, avatarURL: alvoUser.avatarURL, hp: hpMaxB, hpMax: hpMaxB, escudo: 0,
      defesa: (equipB.defesa || 0) + (passivoB.defesaBonus || 0), passivo: passivoB,
      perkAtiva: perkAtivaEquipada(jogadorB0), perkAtivaUsada: false, ultimoFolegoUsado: false,
    },
  };
  estado.turno = estado.a; // desafiante começa

  const jogadorA = getPlayer(estado.a.id, estado.a.username);
  let mao = comprarMao(jogadorA.colecao.length ? jogadorA.colecao : ['comum_espada'], 3, jogadorA.encantamentos, jogadorA.encantamentosArcanos);

  await resposta.deferUpdate(); // confirma o clique na hora; a imagem pode demorar um pouco mais que 3s
  const cenaInicial = await renderizarCenaDuelo(estado);
  await resposta.editReply({
    content: `⚔️ O duelo começou! Vez de **${estado.turno.username}**.`,
    files: cenaInicial.files,
    embeds: [new EmbedBuilder().setColor(0xc04af0).setImage(cenaInicial.imagemUrl)],
    components: montarBotoesMao(mao, estado.turno),
  });
  const msgDuelo = msgDesafio; // mesma mensagem, agora editada — usamos ela pro coletor de botões

  const collector = msgDuelo.createMessageComponentCollector({ time: 5 * 60_000 });

  collector.on('collect', async i => {
    try {
      await tratarClique(i);
    } catch (err) {
      console.error('Erro durante um turno de duelo:', err);
      const payload = { content: '❌ Deu um erro nesse turno do duelo. O duelo foi encerrado, desculpa!', ephemeral: false };
      try {
        if (i.deferred || i.replied) await i.followUp(payload);
        else await i.reply(payload);
      } catch {}
      collector.stop('erro');
      try { await msgDuelo.edit({ components: [] }); } catch {}
    }
  });

  async function tratarClique(i) {
    if (i.user.id !== estado.a.id && i.user.id !== estado.b.id) {
      await i.reply({ content: 'Esse duelo não é seu!', ephemeral: true });
      return;
    }
    if (i.user.id !== estado.turno.id) {
      await i.reply({ content: 'Calma, ainda não é a sua vez!', ephemeral: true });
      return;
    }

    // Uso de perk ativa: não gasta o turno, o mesmo jogador continua na vez
    if (i.customId === 'usar_perk_ativa') {
      if (!estado.turno.perkAtiva || estado.turno.perkAtivaUsada) {
        await i.reply({ content: 'Essa perk não está mais disponível.', ephemeral: true });
        return;
      }
      await i.deferUpdate();

      const oponentePerk = estado.turno.id === estado.a.id ? estado.b : estado.a;
      const resultadoPerk = usarPerkAtiva(estado.turno.perkAtiva, estado.turno, oponentePerk);
      estado.turno.perkAtivaUsada = true;

      const cenaPerk = await renderizarCenaDuelo(estado);
      await i.editReply({
        content: `**${estado.turno.username}** ${resultadoPerk.texto}`,
        files: cenaPerk.files,
        embeds: [new EmbedBuilder().setColor(0xc04af0).setImage(cenaPerk.imagemUrl)],
        components: montarBotoesMao(mao, estado.turno),
      });
      return;
    }

    const idx = parseInt(i.customId.split('_')[1], 10);
    const cartaEscolhida = mao[idx];
    if (!cartaEscolhida) {
      await i.reply({ content: 'Essa carta não é mais válida, espera a próxima rodada.', ephemeral: true });
      return;
    }

    await i.deferUpdate(); // confirma o clique na hora; a imagem pode demorar um pouco mais que 3s

    const oponente = estado.turno.id === estado.a.id ? estado.b : estado.a;

    // Regeneração passiva no início do turno de quem vai jogar
    const curaRegen = aplicarRegeneracaoTurno(estado.turno, estado.turno.passivo);

    const resultado = jogarCarta(cartaEscolhida, estado.turno, oponente, oponente.defesa || 0, estado.turno.passivo);

    let texto = curaRegen > 0 ? `A regeneração de **${estado.turno.username}** curou **${curaRegen}** de vida. ` : '';
    texto += `**${estado.turno.username}** jogou **${cartaEscolhida.nome}** e causou **${resultado.danoCausado}** de dano${resultado.critico ? ' — CRÍTICO! 💥' : ''}.`;
    if (resultado.curaAplicada > 0) texto += ` Recuperou **${resultado.curaAplicada}** de vida.`;
    if (resultado.escudoGanho > 0) texto += ` Ganhou **${resultado.escudoGanho}** de escudo.`;

    // Perk "Último Fôlego" do oponente: salva de um golpe fatal, 1x por duelo
    if (oponente.hp <= 0 && oponente.passivo?.ultimoFolego && !oponente.ultimoFolegoUsado) {
      oponente.hp = 1;
      oponente.ultimoFolegoUsado = true;
      texto += ` ✨ **${oponente.username}** ativou o Último Fôlego e sobreviveu com 1 de vida!`;
    }

    if (oponente.hp <= 0) {
      collector.stop('vitoria');
      const vencedor = estado.turno;
      const perdedor = oponente;

      const jogadorVencedor = getPlayer(vencedor.id, vencedor.username);
      const jogadorPerdedor = getPlayer(perdedor.id, perdedor.username);
      jogadorVencedor.moedas += PREMIO_VENCEDOR;
      jogadorPerdedor.moedas += PREMIO_PERDEDOR;
      jogadorVencedor.estatisticas.duelosVencidos = (jogadorVencedor.estatisticas.duelosVencidos || 0) + 1;
      jogadorPerdedor.estatisticas.duelosPerdidos = (jogadorPerdedor.estatisticas.duelosPerdidos || 0) + 1;
      savePlayer(vencedor.id, jogadorVencedor);
      savePlayer(perdedor.id, jogadorPerdedor);

      const cenaFinal = await renderizarCenaDuelo(estado);
      const embedFinal = new EmbedBuilder()
        .setColor(0x43b581)
        .setTitle(`🏆 ${vencedor.username} venceu o duelo!`)
        .setImage(cenaFinal.imagemUrl)
        .setDescription(`${texto} **${perdedor.username}** foi derrotado!\n\n${vencedor.username} ganhou **${PREMIO_VENCEDOR}** moedas.\n${perdedor.username} ganhou **${PREMIO_PERDEDOR}** moedas por participar.`);

      await i.editReply({ content: null, files: cenaFinal.files, embeds: [embedFinal], components: [] });
      return;
    }

    // troca o turno e sorteia nova mão pra quem vai jogar agora
    estado.turno = oponente;
    const jogadorDaVez = getPlayer(estado.turno.id, estado.turno.username);
    mao = comprarMao(jogadorDaVez.colecao.length ? jogadorDaVez.colecao : ['comum_espada'], 3, jogadorDaVez.encantamentos, jogadorDaVez.encantamentosArcanos);

    const cena = await renderizarCenaDuelo(estado);
    await i.editReply({
      content: texto,
      files: cena.files,
      embeds: [new EmbedBuilder().setColor(0xc04af0).setImage(cena.imagemUrl)],
      components: montarBotoesMao(mao, estado.turno),
    });
  }

  collector.on('end', async (_collected, razao) => {
    if (razao === 'vitoria') return;
    try { await msgDuelo.edit({ components: [] }); } catch {}
  });
}

module.exports = duelCore;
