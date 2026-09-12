const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const cassinoCore = require('../core/cassino');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cassino')
    .setDescription('Aposte no Cassino Medieval: dados, roleta ou cara-e-coroa')
    .addSubcommand(sub => sub
      .setName('dados')
      .setDescription('Jogo de Hazard — role 2 dados e aposte no resultado')
      .addStringOption(opt => opt.setName('aposta').setDescription("Quantidade de moedas a apostar (ou 'all'/'tudo')").setRequired(true)))
    .addSubcommand(sub => sub
      .setName('roleta')
      .setDescription('Roda da Fortuna — gire a roda de madeira')
      .addStringOption(opt => opt.setName('aposta').setDescription("Quantidade de moedas a apostar (ou 'all'/'tudo')").setRequired(true)))
    .addSubcommand(sub => sub
      .setName('moeda')
      .setDescription('Cara ou Coroa do Rei — escolha um lado e aposte')
      .addStringOption(opt => opt.setName('aposta').setDescription("Quantidade de moedas a apostar (ou 'all'/'tudo')").setRequired(true))
      .addStringOption(opt => opt.setName('escolha').setDescription('Cara ou coroa').setRequired(true)
        .addChoices({ name: 'Cara', value: 'cara' }, { name: 'Coroa', value: 'coroa' }))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand(false);
    const aposta = interaction.options.getString('aposta');
    const escolha = interaction.options.getString('escolha');
    await cassinoCore(fromInteraction(interaction), sub, aposta, escolha);
  }
};
