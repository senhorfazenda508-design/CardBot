const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const ajudaCore = require('../core/ajuda');

module.exports = {
  data: new SlashCommandBuilder().setName('ajuda').setDescription('Mostra a lista de todos os comandos'),
  async execute(interaction) {
    await ajudaCore(fromInteraction(interaction));
  }
};
