// Comando /roubar: tenta roubar moedas da CARTEIRA de outro jogador (o que
// está no `/banco` fica protegido, por design — é literalmente pra isso que
// o cofre do Thomas existe). Pensado como um "imposto" sobre quem deixa
// moeda solta sem guardar.

const { EmbedBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { bonusEquipamento } = require('../game/armor');

const MOEDAS_MINIMAS_ALVO = 30; // abaixo disso, nem vale a pena tentar
const COOLDOWN_ATACANTE_MS = 15 * 60 * 1000; // 15 min entre tentativas (sucesso ou falha)
const PROTECAO_VITIMA_MS = 30 * 60 * 1000; // depois de ser roubado, fica 30 min sem poder ser roubado de novo
const CHANCE_BASE = 0.45;
const CHANCE_MINIMA = 0.08; // mesmo com a melhor armadura, sempre existe algum risco
const PERCENTUAL_ROUBADO_MIN = 0.20;
const PERCENTUAL_ROUBADO_MAX = 0.35;
const ROUBO_MAXIMO_ABS = 250;
const MULTA_FALHA_MIN = 10;
const MULTA_FALHA_PCT = 0.05;
const MULTA_FALHA_MAX = 60;

function formatarTempo(ms) {
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

async function roubarCore(ctx, alvoUser) {
  if (!alvoUser) {
    await ctx.send({ content: 'Mencione quem você quer roubar. Ex: `;roubar @pessoa` ou `/roubar alvo:@pessoa`' });
    return;
  }
  if (alvoUser.id === ctx.userId) {
    await ctx.send({ content: 'Você não pode roubar de si mesmo 🙃' });
    return;
  }
  if (alvoUser.bot) {
    await ctx.send({ content: 'Não dá pra roubar um bot!' });
    return;
  }

  const ladrao = getPlayer(ctx.userId, ctx.username);
  const vitima = getPlayer(alvoUser.id, alvoUser.username);

  if (!ladrao.roubo) ladrao.roubo = { ultimoRoubo: 0, protegidoAte: 0 };
  if (!vitima.roubo) vitima.roubo = { ultimoRoubo: 0, protegidoAte: 0 };

  const agora = Date.now();

  const cooldownRestante = (ladrao.roubo.ultimoRoubo || 0) + COOLDOWN_ATACANTE_MS - agora;
  if (cooldownRestante > 0) {
    await ctx.send({ content: `🕵️ Você já tentou um roubo recentemente. Espere ${formatarTempo(cooldownRestante)} antes de tentar de novo.` });
    return;
  }

  if (vitima.moedas < MOEDAS_MINIMAS_ALVO) {
    await ctx.send({ content: `<@${alvoUser.id}> não tem moedas soltas suficientes na carteira pra valer a pena roubar (o que está no \`/banco\` dele está protegido).` });
    return;
  }

  const protecaoRestante = (vitima.roubo.protegidoAte || 0) - agora;
  if (protecaoRestante > 0) {
    await ctx.send({ content: `🛡️ <@${alvoUser.id}> foi roubado(a) recentemente e está de guarda alta — proteção ativa por mais ${formatarTempo(protecaoRestante)}.` });
    return;
  }

  const defesaAlvo = bonusEquipamento(vitima).defesa || 0; // 0 a 0.45, conforme a armadura equipada
  const chanceSucesso = Math.max(CHANCE_MINIMA, CHANCE_BASE - defesaAlvo);
  const sucesso = Math.random() < chanceSucesso;

  ladrao.roubo.ultimoRoubo = agora;

  if (sucesso) {
    const percentual = PERCENTUAL_ROUBADO_MIN + Math.random() * (PERCENTUAL_ROUBADO_MAX - PERCENTUAL_ROUBADO_MIN);
    const quantia = Math.min(ROUBO_MAXIMO_ABS, Math.max(1, Math.floor(vitima.moedas * percentual)));

    vitima.moedas -= quantia;
    ladrao.moedas += quantia;
    vitima.roubo.protegidoAte = agora + PROTECAO_VITIMA_MS;

    savePlayer(alvoUser.id, vitima);
    savePlayer(ctx.userId, ladrao);

    const embed = new EmbedBuilder()
      .setColor(0x43b581)
      .setTitle('🗡️ Roubo bem-sucedido!')
      .setDescription(`Você se aproveitou da distração de <@${alvoUser.id}> e levou 🪙 **${quantia}** moedas da carteira dele(a)!`)
      .setFooter({ text: `Seu saldo agora: ${ladrao.moedas} moedas` });
    await ctx.send({ embeds: [embed] });
    return;
  }

  const multa = Math.min(MULTA_FALHA_MAX, Math.max(MULTA_FALHA_MIN, Math.round(ladrao.moedas * MULTA_FALHA_PCT)));
  const multaAplicada = Math.min(multa, ladrao.moedas);
  ladrao.moedas -= multaAplicada;
  savePlayer(ctx.userId, ladrao);

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('🚨 Roubo fracassado!')
    .setDescription(
      `Você foi flagrado tentando roubar <@${alvoUser.id}> e a guarda da vila te aplicou uma multa de 🪙 **${multaAplicada}** moedas.`
    )
    .setFooter({ text: `Seu saldo agora: ${ladrao.moedas} moedas` });
  await ctx.send({ embeds: [embed] });
}

module.exports = roubarCore;
