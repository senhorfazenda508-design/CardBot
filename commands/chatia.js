const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const chatia = require('../core/chatia');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chatia')
    .setDescription('Liga/pausa o Chat Livre da IA — o bot conversando sozinho, sem comando (só admins)')
    .addSubcommand(s => s
      .setName('ligar')
      .setDescription('Ativa o Chat Livre da IA no canal (o bot responde toda mensagem ali)')
      .addChannelOption(o => o.setName('canal').setDescription('Canal (padrão: este canal)').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(s => s
      .setName('pausar')
      .setDescription('Pausa o Chat Livre da IA no canal')
      .addChannelOption(o => o.setName('canal').setDescription('Canal (padrão: este canal)').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(s => s
      .setName('pausartudo')
      .setDescription('Pausa o Chat Livre da IA em TODOS os canais deste servidor de uma vez'))
    .addSubcommand(s => s
      .setName('status')
      .setDescription('Vê em quais canais o Chat Livre da IA está ativo')),

  async execute(interaction) {
    await interaction.deferReply();
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);

    const sub = interaction.options.getSubcommand();
    const canalOpt = interaction.options.getChannel('canal');
    const canalId = canalOpt ? canalOpt.id : interaction.channelId;

    if (sub === 'ligar') return chatia.chatiaLigar(ctx, canalId);
    if (sub === 'pausar') return chatia.chatiaPausar(ctx, canalId);
    if (sub === 'pausartudo') return chatia.chatiaPausarTudo(ctx);
    if (sub === 'status') return chatia.chatiaStatus(ctx);

    await ctx.send({ content: 'Subcomando não reconhecido.' });
  },
};
