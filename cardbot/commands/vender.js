const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const venderCore = require('../core/vender');
const { getPlayer } = require('../db');
const { CARDS } = require('../game/cards');
const { choicesCartasDoJogador } = require('../lib/autocomplete');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vender')
    .setDescription('Vende uma carta da sua coleção por moedas')
    .addStringOption(opt => opt.setName('nome').setDescription('Nome (ou parte do nome) da carta').setRequired(true).setAutocomplete(true))
    .addIntegerOption(opt => opt.setName('quantidade').setDescription('Quantas cópias vender (padrão: 1)').setRequired(false).setMinValue(1)),
  async execute(interaction) {
    const termo = interaction.options.getString('nome');
    const quantidade = interaction.options.getInteger('quantidade') || 1;
    await venderCore(fromInteraction(interaction), termo, quantidade);
  },
  async autocomplete(interaction) {
    const player = getPlayer(interaction.user.id, interaction.user.username);
    const choices = choicesCartasDoJogador(CARDS, player, interaction.options.getFocused());
    await interaction.respond(choices);
  },
};
