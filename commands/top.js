const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const topCore = require('../core/top');

module.exports = {
  data: new SlashCommandBuilder().setName('top').setDescription('Mostra o ranking de jogadores'),
  async execute(interaction) {
    await topCore(fromInteraction(interaction));
  }
};
