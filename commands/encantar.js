const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const encantarCore = require('../core/encantar');
const { getPlayer } = require('../db');
const { CARDS } = require('../game/cards');
const { choicesCartasDoJogador } = require('../lib/autocomplete');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('encantar')
    .setDescription('Encanta uma carta consumindo cópias dela + moedas, deixando-a mais forte')
    .addStringOption(opt => opt.setName('nome').setDescription('Nome da carta a encantar').setRequired(true).setAutocomplete(true)),
  async execute(interaction) {
    await encantarCore(fromInteraction(interaction), interaction.options.getString('nome'));
  },
  async autocomplete(interaction) {
    const player = getPlayer(interaction.user.id, interaction.user.username);
    const choices = choicesCartasDoJogador(CARDS, player, interaction.options.getFocused());
    await interaction.respond(choices);
  },
};
