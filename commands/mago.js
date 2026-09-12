const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const magoCore = require('../core/mago');
const { getPlayer } = require('../db');
const { CARDS } = require('../game/cards');
const { choicesCartasDoJogador } = require('../lib/autocomplete');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mago')
    .setDescription('Converse com Aldric, o mago arcano, e troque Fragmentos Arcanos por um Selo Arcano')
    .addStringOption(opt =>
      opt.setName('carta').setDescription('Nome da carta que você quer selar').setAutocomplete(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const carta = interaction.options.getString('carta');
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    await magoCore(ctx, carta);
  },
  async autocomplete(interaction) {
    const player = getPlayer(interaction.user.id, interaction.user.username);
    const choices = choicesCartasDoJogador(CARDS, player, interaction.options.getFocused());
    await interaction.respond(choices);
  },
};
