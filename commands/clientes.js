const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const clientesCore = require('../core/clientes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clientes')
    .setDescription('Veja o ranking dos clientes mais fiéis da taverna de Thomas'),
  async execute(interaction) {
    await interaction.deferReply();
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    await clientesCore(ctx);
  },
};
