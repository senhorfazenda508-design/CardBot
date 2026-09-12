const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const convidarCore = require('../core/convidar');
const { npcsConvidaveis } = require('../game/npcs');
const { construirChoices } = require('../lib/autocomplete');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('convidar')
    .setDescription('Convide um morador pra viver na sua vila')
    .addStringOption(opt =>
      opt.setName('npc').setDescription('Nome do morador (deixe vazio pra ver a lista)').setAutocomplete(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const npc = interaction.options.getString('npc');
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    await convidarCore(ctx, npc);
  },
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const choices = construirChoices(npcsConvidaveis(), focused, n => `${n.emoji} ${n.nome}`, n => n.id);
    await interaction.respond(choices);
  },
};
