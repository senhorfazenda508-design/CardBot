const { EmbedBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { jogarDados, girarRoda, jogarMoeda } = require('../game/casino');

const APOSTA_MINIMA = 10;
const APOSTA_MAXIMA = 5000;

const ALIAS_JOGO = {
  dados: 'dados', dado: 'dados', hazard: 'dados', dices: 'dados',
  roleta: 'roleta', roda: 'roleta', fortuna: 'roleta',
  moeda: 'moeda', cara: 'moeda', coroa: 'moeda', coinflip: 'moeda',
};

function embedMenu(player) {
  return new EmbedBuilder()
    .setColor(0xb8860b)
    .setTitle('🏰 Cassino Medieval')
    .setDescription(
      `Bem-vindo(a) à taverna de apostas do reino! Seu saldo: **${player.moedas}** moedas.\n` +
      `Aposta mínima: ${APOSTA_MINIMA} · Aposta máxima: ${APOSTA_MAXIMA}\n\n` +
      '**🎲 Jogo de Hazard** — `/cassino dados aposta:100` (ou `;cassino dados 100`)\n' +
      'Role 2 dados: dobradinha paga 2x, soma alta (9-12) paga 1.5x, soma 7-8 devolve a aposta, o resto perde.\n\n' +
      '**🎡 Roda da Fortuna** — `/cassino roleta aposta:100` (ou `;cassino roleta 100`)\n' +
      'Gire a roda de madeira: os gomos vão de "Ruína" (perde tudo) até "Tesouro do Dragão" (10x)!\n\n' +
      '**🪙 Cara ou Coroa do Rei** — `/cassino moeda aposta:100 escolha:cara` (ou `;cassino moeda 100 cara`)\n' +
      'Escolha cara ou coroa e acerte pra ganhar 1.9x a aposta.\n\n' +
      '💰 Em qualquer jogo, use `all` ou `tudo` no lugar do valor pra apostar todo o seu saldo (até o teto de ' + APOSTA_MAXIMA + ').'
    )
    .setFooter({ text: 'Aposte com responsabilidade — é só um jogo dentro do jogo! 🍺' });
}

const PALAVRAS_TUDO = ['all', 'tudo', 'all-in', 'allin'];

function validarAposta(player, apostaRaw) {
  const raw = (apostaRaw ?? '').toString().trim().toLowerCase();
  const apostarTudo = PALAVRAS_TUDO.includes(raw);
  const aposta = apostarTudo ? Math.min(player.moedas, APOSTA_MAXIMA) : parseInt(raw, 10);

  if (!raw || Number.isNaN(aposta)) {
    return { erro: 'Diga um valor de aposta válido, ou `all`/`tudo` pra apostar tudo. Ex: `;cassino dados 100` ou `;cassino dados all`.' };
  }
  if (aposta < APOSTA_MINIMA) {
    return { erro: `A aposta mínima é **${APOSTA_MINIMA}** moedas.` };
  }
  if (aposta > APOSTA_MAXIMA) {
    return { erro: `A aposta máxima é **${APOSTA_MAXIMA}** moedas.` };
  }
  if (player.moedas < aposta) {
    return { erro: `Você não tem moedas suficientes. Seu saldo: **${player.moedas}**.` };
  }
  return { aposta };
}

function resolverGanho(player, aposta, multiplicador) {
  const retorno = Math.round(aposta * multiplicador);
  player.moedas -= aposta;
  player.moedas += retorno;
  return retorno;
}

async function cassinoCore(ctx, jogoRaw, apostaRaw, escolhaRaw) {
  const player = getPlayer(ctx.userId, ctx.username);

  const jogo = ALIAS_JOGO[(jogoRaw || '').trim().toLowerCase()];
  if (!jogo) {
    await ctx.send({ embeds: [embedMenu(player)] });
    return;
  }

  const { aposta, erro } = validarAposta(player, apostaRaw);
  if (erro) {
    await ctx.send({ content: erro });
    return;
  }

  if (jogo === 'dados') {
    const resultado = jogarDados();
    const retorno = resolverGanho(player, aposta, resultado.multiplicador);
    savePlayer(ctx.userId, player);

    const ganhou = resultado.multiplicador > 1;
    const empatou = resultado.multiplicador === 1;
    const embed = new EmbedBuilder()
      .setColor(ganhou ? 0x43b581 : empatou ? 0xfaa61a : 0xed4245)
      .setTitle('🎲 Jogo de Hazard')
      .setDescription(
        `Você apostou **${aposta}** moedas e rolou 🎲 **${resultado.d1}** e 🎲 **${resultado.d2}** (soma ${resultado.soma}).\n` +
        `${resultado.categoria}\n\n` +
        (retorno > 0 ? `Você recebeu **${retorno}** moedas de volta (${resultado.multiplicador}x).` : 'Você perdeu a aposta.')
      )
      .setFooter({ text: `Saldo agora: ${player.moedas} moedas` });
    await ctx.send({ embeds: [embed] });
    return;
  }

  if (jogo === 'roleta') {
    const gomo = girarRoda();
    const retorno = resolverGanho(player, aposta, gomo.multiplicador);
    savePlayer(ctx.userId, player);

    const ganhou = gomo.multiplicador > 1;
    const empatou = gomo.multiplicador === 1;
    const embed = new EmbedBuilder()
      .setColor(ganhou ? 0x43b581 : empatou ? 0xfaa61a : 0xed4245)
      .setTitle('🎡 Roda da Fortuna')
      .setDescription(
        `Você apostou **${aposta}** moedas e a roda parou em ${gomo.label} (**${gomo.multiplicador}x**)!\n\n` +
        (retorno > 0 ? `Você recebeu **${retorno}** moedas de volta.` : 'Você perdeu a aposta.')
      )
      .setFooter({ text: `Saldo agora: ${player.moedas} moedas` });
    await ctx.send({ embeds: [embed] });
    return;
  }

  if (jogo === 'moeda') {
    let escolha = (escolhaRaw || '').trim().toLowerCase();
    if (escolha !== 'cara' && escolha !== 'coroa') {
      // se o jogador digitou "cara"/"coroa" no lugar do nome do jogo, aproveita como escolha
      if (jogoRaw && ['cara', 'coroa'].includes(jogoRaw.trim().toLowerCase())) {
        escolha = jogoRaw.trim().toLowerCase();
      } else {
        await ctx.send({ content: 'Escolha `cara` ou `coroa`. Ex: `;cassino moeda 100 cara`.' });
        return;
      }
    }

    const resultado = jogarMoeda(escolha);
    const retorno = resolverGanho(player, aposta, resultado.multiplicador);
    savePlayer(ctx.userId, player);

    const embed = new EmbedBuilder()
      .setColor(resultado.acertou ? 0x43b581 : 0xed4245)
      .setTitle('🪙 Cara ou Coroa do Rei')
      .setDescription(
        `Você apostou **${aposta}** moedas em **${escolha}**. A moeda caiu em **${resultado.resultado}**.\n\n` +
        (resultado.acertou ? `Você acertou e recebeu **${retorno}** moedas de volta (1.9x)!` : 'Você errou e perdeu a aposta.')
      )
      .setFooter({ text: `Saldo agora: ${player.moedas} moedas` });
    await ctx.send({ embeds: [embed] });
    return;
  }
}

module.exports = cassinoCore;
