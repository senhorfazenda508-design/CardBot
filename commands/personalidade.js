const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const personalidadeCore = require('../core/personalidade');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('personalidade')
    .setDescription('Veja ou mude o comportamento do Narrador (IA) neste servidor')
    .addSubcommand(sub => sub.setName('ver').setDescription('Mostra a personalidade customizada atual'))
    .addSubcommand(sub =>
      sub
        .setName('definir')
        .setDescription('Define um toque extra de personalidade pro Narrador (requer Gerenciar Servidor)')
        .addStringOption(opt => opt.setName('texto').setDescription('Como o Narrador deve se comportar').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('resetar').setDescription('Volta o Narrador ao comportamento padrão (requer Gerenciar Servidor)')),
  async execute(interaction) {
    await interaction.deferReply();
    const acao = interaction.options.getSubcommand();
    const texto = interaction.options.getString('texto');
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    await personalidadeCore(ctx, acao, texto);
  },
};
