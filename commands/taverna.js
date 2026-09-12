const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const tavernaCore = require('../core/taverna');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taverna')
    .setDescription('Veja uma cena dos moradores da sua vila conversando entre si na taverna'),
  async execute(interaction) {
    await interaction.deferReply();
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    await tavernaCore(ctx);
  },
};
