const { EmbedBuilder } = require('discord.js');
const { getPersona, setPersona, resetPersona, MAX_TAMANHO } = require('../game/iaPersona');

async function personalidadeCore(ctx, acao, texto) {
  if (!ctx.guildId) {
    await ctx.send({ content: '❌ Esse comando só funciona dentro de um servidor (não em DM), porque a personalidade é configurada por servidor.' });
    return;
  }

  const subcomando = (acao || 'ver').toLowerCase();

  if (subcomando === 'ver') {
    const persona = getPersona(ctx.guildId);
    const embed = new EmbedBuilder()
      .setColor(0x8e5bf2)
      .setTitle('🔮 Personalidade do Narrador (IA) neste servidor')
      .setDescription(
        persona
          ? `Toque extra ativo:\n> ${persona}`
          : 'Nenhuma personalidade customizada definida — o Narrador está no comportamento padrão.'
      )
      .setFooter({ text: 'Use "definir <texto>" (precisa de Gerenciar Servidor) pra mudar, ou "resetar" pra voltar ao padrão.' });
    await ctx.send({ embeds: [embed] });
    return;
  }

  // A partir daqui, todas as ações mudam o comportamento do servidor inteiro,
  // então exigem permissão de Gerenciar Servidor.
  if (!ctx.podeGerenciarServidor) {
    await ctx.send({ content: '❌ Só quem tem a permissão **Gerenciar Servidor** pode mudar a personalidade do Narrador. Use `ver` pra só consultar.' });
    return;
  }

  if (subcomando === 'resetar') {
    resetPersona(ctx.guildId);
    await ctx.send({ content: '✅ Personalidade do Narrador resetada para o padrão.' });
    return;
  }

  if (subcomando === 'definir') {
    const limpo = (texto || '').trim();
    if (!limpo) {
      await ctx.send({ content: `Descreva como você quer que o Narrador se comporte. Ex: \`;personalidade definir seja sarcástico e faça piadas sobre os monstros\` (até ${MAX_TAMANHO} caracteres).` });
      return;
    }
    const salvo = setPersona(ctx.guildId, limpo);
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Personalidade do Narrador atualizada!')
      .setDescription(`> ${salvo}`)
      .setFooter({ text: 'As regras de segurança do bot continuam valendo por cima disso, sempre.' });
    await ctx.send({ embeds: [embed] });
    return;
  }

  await ctx.send({ content: 'Uso: `;personalidade ver`, `;personalidade definir <texto>` ou `;personalidade resetar`.' });
}

module.exports = personalidadeCore;
