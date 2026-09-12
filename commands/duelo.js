const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const duelCore = require('../core/duelo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duelo')
    .setDescription('Desafia outro jogador para uma batalha PvP')
    .addUserOption(opt => opt.setName('oponente').setDescription('Quem você quer desafiar').setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const alvo = interaction.options.getUser('oponente');
    const alvoUser = {
      id: alvo.id,
      username: alvo.username,
      avatarURL: alvo.displayAvatarURL({ extension: 'png', size: 256 }),
      bot: alvo.bot,
    };
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    await duelCore(ctx, alvoUser);
  }
};
