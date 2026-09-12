// Comandos de admin pra controlar o "Chat Livre da IA" (o bot com
// personalidade própria conversando ao vivo, sem precisar de comando) —
// liga/pausa por canal, pausa tudo de uma vez (botão de pânico) e status.
// A lógica de conversa em si mora em game/chatBotIA.js.

const { EmbedBuilder } = require('discord.js');
const { ehAdmin } = require('../lib/adminAuth');
const chatBotIA = require('../game/chatBotIA');

const COR = 0x57f287;

function embedChatIA(descricao) {
  return new EmbedBuilder().setColor(COR).setAuthor({ name: '🤖 Chat Livre da IA' }).setDescription(descricao);
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

async function chatiaLigar(ctx, canalId) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!ctx.guildId) return negarForaDeServidor(ctx);

  const acabouDeAtivar = chatBotIA.ligar(ctx.guildId, canalId);
  await ctx.send({
    embeds: [embedChatIA(
      acabouDeAtivar
        ? `Ativado em <#${canalId}>! A partir de agora eu respondo qualquer mensagem normal ali, sem precisar de comando nem @menção. Pra eu parar, usem \`/chatia pausar\` (ou \`;chatia pausar\`) nesse canal.`
        : `<#${canalId}> já estava ativado, nada mudou.`
    )],
  });
}

async function chatiaPausar(ctx, canalId) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!ctx.guildId) return negarForaDeServidor(ctx);

  const estavaAtivo = chatBotIA.pausar(ctx.guildId, canalId);
  await ctx.send({
    embeds: [embedChatIA(
      estavaAtivo
        ? `Pausado em <#${canalId}>. Eu só volto a falar sozinho ali se um admin ligar de novo — mas ainda respondo se alguém me @mencionar direto, ou em DM.`
        : `<#${canalId}> já estava desligado, nada pra pausar aqui.`
    )],
  });
}

async function chatiaPausarTudo(ctx) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!ctx.guildId) return negarForaDeServidor(ctx);

  const quantos = chatBotIA.pausarTudo(ctx.guildId);
  await ctx.send({
    embeds: [embedChatIA(
      quantos > 0
        ? `Pausado em todos os ${quantos} canal(is) onde estava ativo neste servidor. Continuo respondendo se me @mencionarem direto, ou em DM.`
        : 'Já não tinha nenhum canal ativo neste servidor.'
    )],
  });
}

async function chatiaStatus(ctx) {
  if (!ehAdmin(ctx)) return negarAcesso(ctx);
  if (!ctx.guildId) return negarForaDeServidor(ctx);

  const canais = chatBotIA.status(ctx.guildId);
  await ctx.send({
    embeds: [embedChatIA(
      canais.length
        ? `Ativo em: ${canais.map(id => `<#${id}>`).join(', ')}\n\nFora desses, eu só respondo se alguém me @mencionar direto (ou em DM).`
        : 'Nenhum canal ativado neste servidor no momento — eu só respondo se alguém me @mencionar direto, ou em DM.'
    )],
  });
}

module.exports = { chatiaLigar, chatiaPausar, chatiaPausarTudo, chatiaStatus };
