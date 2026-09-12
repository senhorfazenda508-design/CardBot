const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const lojaCore = require('../core/loja');

module.exports = {
  data: new SlashCommandBuilder().setName('loja').setDescription('Abra a loja e compre pacotes de cartas'),
  async execute(interaction) {
    await lojaCore(fromInteraction(interaction));
  }
};
