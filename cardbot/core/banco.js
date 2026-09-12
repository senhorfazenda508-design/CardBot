const { EmbedBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');

// Cofre da taverna do Thomas: um lugar seguro pra guardar moedas fora da
// carteira (protegidas de apostas por impulso no cassino) e que ainda rende
// um juro pequeno enquanto ficam lá.
const JUROS_DIA = 0.01; // 1% ao dia
const JUROS_MAX_DIAS = 10; // não acumula juros por mais de 10 dias parado, pra não incentivar ficar off pra sempre
const UM_DIA_MS = 24 * 60 * 60 * 1000;

// Aplica juros pendentes ao saldo do cofre (se houver) e devolve quanto foi ganho.
function aplicarJuros(player) {
  const banco = player.banco;
  if (!banco.saldo || banco.saldo <= 0) {
    banco.ultimoJuros = Date.now();
    return 0;
  }
  const diasPassados = Math.min(JUROS_MAX_DIAS, Math.floor((Date.now() - banco.ultimoJuros) / UM_DIA_MS));
  if (diasPassados <= 0) return 0;
  const jurosGanhos = Math.round(banco.saldo * JUROS_DIA * diasPassados);
  banco.saldo += jurosGanhos;
  banco.ultimoJuros = Date.now();
  return jurosGanhos;
}

function interpretarQuantidade(quantidadeStr, maximo) {
  const normalizado = String(quantidadeStr || '').trim().toLowerCase();
  if (normalizado === 'all' || normalizado === 'tudo') return maximo;
  const valor = parseInt(normalizado, 10);
  return Number.isInteger(valor) ? valor : null;
}

async function bancoCore(ctx, acao, quantidadeStr) {
  const player = getPlayer(ctx.userId, ctx.username);
  const jurosGanhos = aplicarJuros(player);

  const acaoNorm = (acao || 'ver').toLowerCase();

  if (acaoNorm === 'ver' || acaoNorm === 'saldo') {
    savePlayer(ctx.userId, player);
    const embed = new EmbedBuilder()
      .setColor(0xd9a441)
      .setAuthor({ name: 'Cofre da Taverna de Thomas' })
      .setTitle('🏦 Sua conta no cofre')
      .setDescription(
        `💰 Carteira: **${player.moedas}** moedas\n` +
        `🏦 No cofre: **${player.banco.saldo}** moedas\n\n` +
        (jurosGanhos > 0 ? `📈 Você ganhou **${jurosGanhos}** moedas de juros desde a última visita!\n\n` : '') +
        `Moedas guardadas no cofre rendem **${JUROS_DIA * 100}%** ao dia (máx. ${JUROS_MAX_DIAS} dias acumulados sem visitar) e ficam protegidas de perdas em duelos, apostas por impulso e queda na masmorra.\n\n` +
        'Use `;banco depositar <quantidade>` ou `;banco sacar <quantidade>` (ou `tudo`).'
      );
    await ctx.send({ embeds: [embed] });
    return;
  }

  if (acaoNorm === 'depositar' || acaoNorm === 'deposit' || acaoNorm === 'guardar') {
    const quantidade = interpretarQuantidade(quantidadeStr, player.moedas);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      await ctx.send({ content: 'Diga quanto quer depositar. Ex: `;banco depositar 100` ou `;banco depositar tudo`' });
      return;
    }
    if (player.moedas < quantidade) {
      await ctx.send({ content: `Você só tem ${player.moedas} moedas na carteira.` });
      return;
    }
    player.moedas -= quantidade;
    player.banco.saldo += quantidade;
    savePlayer(ctx.userId, player);

    const embed = new EmbedBuilder()
      .setColor(0x43b581)
      .setTitle('🏦 Depósito realizado')
      .setDescription(`Você guardou **${quantidade}** moedas no cofre.`)
      .setFooter({ text: `Carteira: ${player.moedas} moedas · No cofre: ${player.banco.saldo} moedas` });
    await ctx.send({ embeds: [embed] });
    return;
  }

  if (acaoNorm === 'sacar' || acaoNorm === 'withdraw' || acaoNorm === 'retirar') {
    const quantidade = interpretarQuantidade(quantidadeStr, player.banco.saldo);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      await ctx.send({ content: 'Diga quanto quer sacar. Ex: `;banco sacar 100` ou `;banco sacar tudo`' });
      return;
    }
    if (player.banco.saldo < quantidade) {
      await ctx.send({ content: `Você só tem ${player.banco.saldo} moedas no cofre.` });
      return;
    }
    player.banco.saldo -= quantidade;
    player.moedas += quantidade;
    savePlayer(ctx.userId, player);

    const embed = new EmbedBuilder()
      .setColor(0x43b581)
      .setTitle('💰 Saque realizado')
      .setDescription(`Você sacou **${quantidade}** moedas do cofre.`)
      .setFooter({ text: `Carteira: ${player.moedas} moedas · No cofre: ${player.banco.saldo} moedas` });
    await ctx.send({ embeds: [embed] });
    return;
  }

  await ctx.send({ content: 'Ação inválida. Use `;banco` (ver saldo), `;banco depositar <qtd>` ou `;banco sacar <qtd>`.' });
}

module.exports = bancoCore;
