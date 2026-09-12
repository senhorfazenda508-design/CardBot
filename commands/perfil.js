const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const perfilCore = require('../core/perfil');

module.exports = {
  data: new SlashCommandBuilder().setName('perfil').setDescription('Mostra seu perfil de aventureiro'),
  async execute(interaction) {
    await interaction.deferReply();
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    await perfilCore(ctx);
  }
};
