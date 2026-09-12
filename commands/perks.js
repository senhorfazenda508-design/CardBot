const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const perksCore = require('../core/perks');

module.exports = {
  data: new SlashCommandBuilder().setName('perks').setDescription('Veja e equipe suas perks passivas e ativas'),
  async execute(interaction) {
    await perksCore(fromInteraction(interaction));
  }
};
