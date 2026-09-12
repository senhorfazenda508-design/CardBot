const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const iaCore = require('../core/ia');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ia')
    .setDescription('Converse com o Narrador (IA) do bot')
    .addStringOption(opt => opt.setName('mensagem').setDescription("O que você quer dizer (ou 'limpar' pra reiniciar a conversa)").setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const mensagem = interaction.options.getString('mensagem');
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    await iaCore(ctx, mensagem);
  },
};
