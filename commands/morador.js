const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const moradorCore = require('../core/morador');
const { getPlayer } = require('../db');
const { npcsConvidaveis } = require('../game/npcs');
const { construirChoices } = require('../lib/autocomplete');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('morador')
    .setDescription('Converse com um morador convidado pra sua vila')
    .addStringOption(opt =>
      opt.setName('npc').setDescription('Nome do morador (deixe vazio pra ver quem mora na sua vila)').setAutocomplete(true)
    )
    .addStringOption(opt =>
      opt.setName('mensagem').setDescription('O que você quer dizer pra ele(a)')
    )
    .addUserOption(opt =>
      opt.setName('sobre').setDescription('Pergunte a opinião dele(a) sobre outro jogador')
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const npc = interaction.options.getString('npc');
    const mensagem = interaction.options.getString('mensagem');
    const usuarioAlvo = interaction.options.getUser('sobre');
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    const alvoUser = usuarioAlvo ? { id: usuarioAlvo.id, username: usuarioAlvo.username, bot: usuarioAlvo.bot } : null;
    await moradorCore(ctx, npc, mensagem, alvoUser);
  },
  async autocomplete(interaction) {
    const player = getPlayer(interaction.user.id, interaction.user.username);
    const moradores = npcsConvidaveis().filter(n => player.npcs?.[n.id]?.convidado);
    const focused = interaction.options.getFocused();
    const choices = construirChoices(moradores, focused, n => `${n.emoji} ${n.nome}`, n => n.id);
    await interaction.respond(choices);
  },
};
