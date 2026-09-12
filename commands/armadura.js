const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const armaduraCore = require('../core/armadura');

module.exports = {
  data: new SlashCommandBuilder().setName('armadura').setDescription('Veja e equipe suas armaduras'),
  async execute(interaction) {
    await armaduraCore(fromInteraction(interaction));
  }
};
