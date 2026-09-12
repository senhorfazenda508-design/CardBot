const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const recolherCore = require('../core/recolher');

module.exports = {
  data: new SlashCommandBuilder().setName('recolher').setDescription('Encerra sua run atual com segurança e guarda as moedas ganhas'),
  async execute(interaction) {
    await recolherCore(fromInteraction(interaction));
  }
};
