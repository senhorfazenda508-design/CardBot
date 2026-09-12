const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const taverneiroCore = require('../core/taverneiro');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taverneiro')
    .setDescription('Converse com Thomas, o taverneiro da vila (movido a IA)')
    .addStringOption(opt =>
      opt.setName('mensagem').setDescription('O que você quer dizer pra ele').setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('sobre').setDescription('Pergunte a opinião dele sobre outro jogador da taverna')
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const mensagem = interaction.options.getString('mensagem');
    const usuarioAlvo = interaction.options.getUser('sobre');
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);
    const alvoUser = usuarioAlvo ? { id: usuarioAlvo.id, username: usuarioAlvo.username, bot: usuarioAlvo.bot } : null;
    await taverneiroCore(ctx, mensagem, alvoUser);
  },
};
