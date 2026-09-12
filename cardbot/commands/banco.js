const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const bancoCore = require('../core/banco');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banco')
    .setDescription('Gerencie sua conta no cofre da taverna de Thomas')
    .addStringOption(opt =>
      opt.setName('acao').setDescription('O que você quer fazer').addChoices(
        { name: 'ver saldo', value: 'ver' },
        { name: 'depositar', value: 'depositar' },
        { name: 'sacar', value: 'sacar' },
      )
    )
    .addStringOption(opt =>
      opt.setName('quantidade').setDescription('Quantidade de moedas (ou "tudo")')
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const acao = interaction.options.getString('acao') || 'ver';
    const quantidade = interaction.options.getString('quantidade');
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    await bancoCore(ctx, acao, quantidade);
  },
};
