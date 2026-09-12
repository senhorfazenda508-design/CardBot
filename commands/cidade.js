const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const cidadeCore = require('../core/cidade');

module.exports = {
  data: new SlashCommandBuilder().setName('cidade').setDescription('Veja e construa sua cidade — colonize até ser a maior!'),
  async execute(interaction) {
    await interaction.deferReply();
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    await cidadeCore(ctx);
  }
};
