// Comandos de admin pra controlar a "Charuma" — um segundo bot de
// personalidade própria que conversa sozinho com a ChatIA num canal, em
// loop, até alguém mandar parar. A lógica da conversa em si mora em
// game/charumaBot.js.

const { EmbedBuilder } = require('discord.js');
const { ehAdmin } = require('../lib/adminAuth');
const charumaBot = require('../game/charumaBot');

const COR = 0xffa500;

function embedCharuma(descricao) {
  return new EmbedBuilder().setColor(COR).setAuthor({ name: '🚬🤖 Charuma & ChatIA' }).setDescription(descricao);
}

async function negarAcesso(ctx) {
  await ctx.send({
    content: '⛔ Esse comando é só pra administradores do servidor (permissão "Gerenciar Servidor") ou donos do bot.',
    ephemeral: true,
  });
}

async function negarForaDeServidor(ctx) {
  await ctx.send({ content: '⚠️ Isso só funciona dentro de um servidor, não em DM.' });
}

async function charumaIniciar(ctx, message) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!ctx.guildId) return negarForaDeServidor(ctx);

  if (!process.env.OPENROUTER_API_KEY) {
    await ctx.send({ content: '⚠️ Nenhuma `OPENROUTER_API_KEY` configurada no bot — sem ela nenhum dos dois consegue falar.' });
    return;
  }

  if (charumaBot.estaAtiva(message.channelId)) {
    await ctx.send({
      embeds: [embedCharuma('Já tem uma conversa rolando aqui. Use `;charuma parar` primeiro se quiser reiniciar do zero.')],
    });
    return;
  }

  await ctx.send({
    embeds: [embedCharuma(
      'Começando! A partir de agora a Charuma e a ChatIA vão ficar trocando mensagens sozinhas aqui no canal, a cada poucos segundos, ' +
      'sem precisar de ninguém digitando nada. Isso continua até alguém usar `;charuma parar` (ou até a sessão bater o limite de falas).'
    )],
  });

  charumaBot.iniciar(ctx.guildId, message.channel);
}

async function charumaParar(ctx, message) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!ctx.guildId) return negarForaDeServidor(ctx);

  const estavaAtiva = charumaBot.parar(message.channelId);
  await ctx.send({
    embeds: [embedCharuma(
      estavaAtiva
        ? 'Parado! A Charuma e a ChatIA já não estão mais se respondendo automaticamente aqui.'
        : 'Não tinha nenhuma conversa rolando nesse canal.'
    )],
  });
}

module.exports = { charumaIniciar, charumaParar };
