
const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const raridadesCore = require('../core/raridades');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raridades')
    .setDescription('Mostra as cartas por raridade com botões'),

  async execute(interaction) {
    await interaction.deferReply();
    await raridadesCore({
      ...fromInteraction(interaction),
      send: payload => interaction.editReply(payload),
    });
  },
};
