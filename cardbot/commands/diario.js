const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const diarioCore = require('../core/diario');

module.exports = {
  data: new SlashCommandBuilder().setName('diario').setDescription('Recolhe sua recompensa diária de moedas'),
  async execute(interaction) {
    await diarioCore(fromInteraction(interaction));
  }
};
