const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const saldoCore = require('../core/saldo');

module.exports = {
  data: new SlashCommandBuilder().setName('saldo').setDescription('Mostra quantas moedas você tem'),
  async execute(interaction) {
    await saldoCore(fromInteraction(interaction));
  }
};
