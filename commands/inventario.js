const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const inventarioCore = require('../core/inventario');

module.exports = {
  data: new SlashCommandBuilder().setName('inventario').setDescription('Mostra todas as cartas da sua coleção'),
  async execute(interaction) {
    await interaction.deferReply();
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    await inventarioCore(ctx);
  }
};
