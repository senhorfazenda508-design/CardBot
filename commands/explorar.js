const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const explorarCore = require('../core/explorar');

module.exports = {
  data: new SlashCommandBuilder().setName('explorar').setDescription('Avance na masmorra roguelite e enfrente o próximo inimigo'),
  async execute(interaction) {
    await interaction.deferReply();
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    await explorarCore(ctx);
  }
};
