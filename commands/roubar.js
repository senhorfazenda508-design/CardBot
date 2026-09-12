const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const roubarCore = require('../core/roubar');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roubar')
    .setDescription('Tente roubar moedas soltas de outro jogador (o que está no banco dele é protegido)')
    .addUserOption(opt =>
      opt.setName('alvo').setDescription('Quem você quer roubar').setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const usuarioAlvo = interaction.options.getUser('alvo');
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    const alvoUser = usuarioAlvo ? { id: usuarioAlvo.id, username: usuarioAlvo.username, bot: usuarioAlvo.bot } : null;
    await roubarCore(ctx, alvoUser);
  },
};
