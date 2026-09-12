const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const darCore = require('../core/dar');
const { getPlayer } = require('../db');
const { CARDS } = require('../game/cards');
const { choicesCartasDoJogador } = require('../lib/autocomplete');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dar')
    .setDescription('Presenteia outro jogador com moedas ou uma carta')
    .addUserOption(opt => opt.setName('pessoa').setDescription('Quem vai receber o presente').setRequired(true))
    .addIntegerOption(opt => opt.setName('moedas').setDescription('Quantidade de moedas para doar').setRequired(false).setMinValue(1))
    .addStringOption(opt => opt.setName('carta').setDescription('Nome da carta para doar (se não for moedas)').setRequired(false).setAutocomplete(true)),
  async execute(interaction) {
    const alvo = interaction.options.getUser('pessoa');
    const moedas = interaction.options.getInteger('moedas');
    const carta = interaction.options.getString('carta');
    const alvoUser = {
      id: alvo.id,
      username: alvo.username,
      avatarURL: alvo.displayAvatarURL({ extension: 'png', size: 256 }),
      bot: alvo.bot,
    };
    const entrada = moedas != null ? String(moedas) : carta;
    await darCore(fromInteraction(interaction), alvoUser, entrada);
  },
  async autocomplete(interaction) {
    const player = getPlayer(interaction.user.id, interaction.user.username);
    const choices = choicesCartasDoJogador(CARDS, player, interaction.options.getFocused());
    await interaction.respond(choices);
  },
};
