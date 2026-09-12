// Cria um "contexto" unificado para que a mesma lógica de jogo funcione
// tanto vindo de uma slash command (/explorar) quanto de um comando com
// prefixo (;explorar / ;adv).

const { PermissionsBitField } = require('discord.js');

function fromInteraction(interaction) {
  return {
    userId: interaction.user.id,
    username: interaction.user.username,
    avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
    guildId: interaction.guildId || null,
    podeGerenciarServidor: Boolean(
      interaction.guildId && interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)
    ),
    ephemeralOk: true,
    async send(payload) {
      return interaction.reply({ ...payload, fetchReply: true });
    },
    async followUp(payload) {
      return interaction.followUp(payload);
    },
  };
}

function fromMessage(message) {
  return {
    userId: message.author.id,
    username: message.author.username,
    avatarURL: message.author.displayAvatarURL({ extension: 'png', size: 256 }),
    guildId: message.guildId || null,
    podeGerenciarServidor: Boolean(
      message.guildId && message.member?.permissions?.has(PermissionsBitField.Flags.ManageGuild)
    ),
    ephemeralOk: false, // mensagens normais não suportam "ephemeral"
    async send(payload) {
      const { ephemeral, ...resto } = payload;
      return message.channel.send(resto);
    },
    async followUp(payload) {
      const { ephemeral, ...resto } = payload;
      return message.channel.send(resto);
    },
  };
}

module.exports = { fromInteraction, fromMessage };
