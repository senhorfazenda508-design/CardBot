const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const cartaCore = require('../core/carta');
const { CARDS } = require('../game/cards');
const { construirChoices } = require('../lib/autocomplete');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('carta')
    .setDescription('Mostra os detalhes de uma carta específica')
    .addStringOption(opt => opt.setName('nome').setDescription('Nome (ou parte do nome) da carta').setRequired(true).setAutocomplete(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    const termo = interaction.options.getString('nome');
    await cartaCore(ctx, termo);
  },
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const choices = construirChoices(Object.values(CARDS), focused, c => `${c.emoji} ${c.nome} (${c.raridade})`, c => c.nome);
    await interaction.respond(choices);
  },
};
