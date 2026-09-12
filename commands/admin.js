const { SlashCommandBuilder } = require('discord.js');
const { fromInteraction } = require('../lib/adapter');
const { construirChoices } = require('../lib/autocomplete');
const admin = require('../core/admin');
const { CARDS } = require('../game/cards');
const { listaArmaduras } = require('../game/armor');
const { listaPerks } = require('../game/perks');
const { getNPCS } = require('../game/npcs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Painel de administração do bot (só admins)')
    // IMPORTANTE: não usamos .setDefaultMemberPermissions() aqui de propósito.
    // Isso escondia o /admin da lista de comandos do Discord pra QUALQUER
    // pessoa sem "Gerenciar Servidor" — inclusive donos do bot listados em
    // OWNER_IDS (lib/adminAuth.js), que deveriam poder usá-lo em qualquer
    // servidor/DM mesmo sem essa permissão local. Era por isso que /admin
    // "sumia" pra eles: o Discord filtra a visibilidade ANTES do nosso
    // código rodar, então a checagem de dono nunca chegava a ser avaliada.
    // A permissão continua sendo aplicada de verdade — só que em tempo de
    // execução, aqui embaixo e de novo em cada função de core/admin.js
    // (ehAdmin), que nega educadamente quem não é admin nem dono.
    .addSubcommandGroup(g => g
      .setName('jogador')
      .setDescription('Gerenciar dados de um jogador')
      .addSubcommand(s => s.setName('moedas').setDescription('Ajusta as moedas da carteira de um jogador')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))
        .addIntegerOption(o => o.setName('quantidade').setDescription('Quantidade (negativo pra remover)').setRequired(true)))
      .addSubcommand(s => s.setName('banco').setDescription('Ajusta o saldo do banco de um jogador')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))
        .addIntegerOption(o => o.setName('quantidade').setDescription('Quantidade (negativo pra remover)').setRequired(true)))
      .addSubcommand(s => s.setName('carta').setDescription('Dá carta(s) pra um jogador')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))
        .addStringOption(o => o.setName('carta').setDescription('Nome ou id da carta').setRequired(true).setAutocomplete(true))
        .addIntegerOption(o => o.setName('quantidade').setDescription('Quantas cópias (padrão 1, máx 50)').setMinValue(1).setMaxValue(50)))
      .addSubcommand(s => s.setName('removercarta').setDescription('Remove carta(s) de um jogador')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))
        .addStringOption(o => o.setName('carta').setDescription('Nome ou id da carta').setRequired(true).setAutocomplete(true))
        .addIntegerOption(o => o.setName('quantidade').setDescription('Quantas cópias remover (padrão 1)').setMinValue(1)))
      .addSubcommand(s => s.setName('armadura').setDescription('Dá uma armadura pra um jogador')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))
        .addStringOption(o => o.setName('armadura').setDescription('Nome ou id da armadura').setRequired(true).setAutocomplete(true)))
      .addSubcommand(s => s.setName('perk').setDescription('Dá uma perk pra um jogador')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))
        .addStringOption(o => o.setName('perk').setDescription('Nome ou id da perk').setRequired(true).setAutocomplete(true)))
      .addSubcommand(s => s.setName('fragmentos').setDescription('Ajusta os Fragmentos Arcanos de um jogador')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))
        .addIntegerOption(o => o.setName('quantidade').setDescription('Quantidade (negativo pra remover)').setRequired(true)))
      .addSubcommand(s => s.setName('perfil').setDescription('Vê um resumo técnico completo de um jogador')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true)))
      .addSubcommand(s => s.setName('resetar').setDescription('Reseta um jogador pro estado inicial (IRREVERSÍVEL)')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))
        .addBooleanOption(o => o.setName('confirmar').setDescription('Confirme que tem certeza'))))
    .addSubcommandGroup(g => g
      .setName('cidade')
      .setDescription('Gerenciar a cidade de um jogador')
      .addSubcommand(s => s.setName('recursos').setDescription('Ajusta um recurso da cidade de um jogador')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))
        .addStringOption(o => o.setName('recurso').setDescription('Qual recurso').setRequired(true)
          .addChoices({ name: 'Madeira', value: 'madeira' }, { name: 'Pedra', value: 'pedra' }, { name: 'Comida', value: 'comida' }, { name: 'Ouro', value: 'ouro' }))
        .addIntegerOption(o => o.setName('quantidade').setDescription('Quantidade (negativo pra remover)').setRequired(true)))
      .addSubcommand(s => s.setName('saque').setDescription('Simula um saque de recursos de masmorra pra um jogador (funciona sem cidade fundada)')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true)))
      .addSubcommand(s => s.setName('resetar').setDescription('Reseta a cidade de um jogador (IRREVERSÍVEL)')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))
        .addBooleanOption(o => o.setName('confirmar').setDescription('Confirme que tem certeza'))))
    .addSubcommandGroup(g => g
      .setName('npc')
      .setDescription('Gerenciar moradores/NPCs de um jogador')
      .addSubcommand(s => s.setName('convidar').setDescription('Convida um morador pra vila de um jogador de graça')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))
        .addStringOption(o => o.setName('npc').setDescription('Nome ou id do morador').setRequired(true).setAutocomplete(true)))
      .addSubcommand(s => s.setName('resetarmemoria').setDescription('Apaga a memória de conversa de um jogador com um NPC')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))
        .addStringOption(o => o.setName('quem').setDescription('Nome do NPC, "taverneiro", "narrador" ou "todos"').setRequired(true).setAutocomplete(true)))
      .addSubcommand(s => s.setName('personalidade').setDescription('Ver/definir como um NPC deve agir e de qual época ele deve parecer ser (neste servidor)')
        .addStringOption(o => o.setName('npc').setDescription('Nome ou id do NPC (ex: taverneiro, helena, isadora...)').setRequired(true).setAutocomplete(true))
        .addStringOption(o => o.setName('texto').setDescription('Como ele deve agir (deixe vazio pra não mudar isso)'))
        .addStringOption(o => o.setName('epoca').setDescription('De qual ano/época ele deve parecer ser (ex: "1920", "futurista")'))
        .addBooleanOption(o => o.setName('resetar').setDescription('Se true, apaga o ajuste customizado desse NPC e volta ao padrão')))
      .addSubcommand(s => s.setName('liberar').setDescription('Faz um NPC parar de estar "de mal" com um jogador imediatamente')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))
        .addStringOption(o => o.setName('npc').setDescription('Nome do NPC ou "taverneiro"').setRequired(true).setAutocomplete(true))))
    .addSubcommandGroup(g => g
      .setName('roubo')
      .setDescription('Gerenciar o sistema de roubo de um jogador')
      .addSubcommand(s => s.setName('limpar').setDescription('Zera cooldown e proteção de roubo de um jogador')
        .addUserOption(o => o.setName('usuario').setDescription('Jogador').setRequired(true))))
    .addSubcommandGroup(g => g
      .setName('sistema')
      .setDescription('Ferramentas gerais do bot')
      .addSubcommand(s => s.setName('anuncio').setDescription('Manda um anúncio formatado')
        .addStringOption(o => o.setName('mensagem').setDescription('Texto do anúncio').setRequired(true)))
      .addSubcommand(s => s.setName('stats').setDescription('Vê estatísticas gerais do bot'))),

  async execute(interaction) {
    await interaction.deferReply();
    const ctx = fromInteraction(interaction);
    ctx.send = payload => interaction.editReply(payload);

    const grupo = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();
    const u = interaction.options.getUser('usuario');
    const alvoUser = u ? { id: u.id, username: u.username, bot: u.bot } : null;

    if (grupo === 'jogador') {
      if (sub === 'moedas') return admin.adminMoedas(ctx, alvoUser, interaction.options.getInteger('quantidade'));
      if (sub === 'banco') return admin.adminBanco(ctx, alvoUser, interaction.options.getInteger('quantidade'));
      if (sub === 'carta') return admin.adminCarta(ctx, alvoUser, interaction.options.getString('carta'), interaction.options.getInteger('quantidade') || 1);
      if (sub === 'removercarta') return admin.adminRemoverCarta(ctx, alvoUser, interaction.options.getString('carta'), interaction.options.getInteger('quantidade') || 1);
      if (sub === 'armadura') return admin.adminArmadura(ctx, alvoUser, interaction.options.getString('armadura'));
      if (sub === 'perk') return admin.adminPerk(ctx, alvoUser, interaction.options.getString('perk'));
      if (sub === 'fragmentos') return admin.adminFragmentos(ctx, alvoUser, interaction.options.getInteger('quantidade'));
      if (sub === 'perfil') return admin.adminPerfilDebug(ctx, alvoUser);
      if (sub === 'resetar') return admin.adminResetarJogador(ctx, alvoUser, Boolean(interaction.options.getBoolean('confirmar')));
    }

    if (grupo === 'cidade') {
      if (sub === 'recursos') return admin.adminCidadeRecursos(ctx, alvoUser, interaction.options.getString('recurso'), interaction.options.getInteger('quantidade'));
      if (sub === 'saque') return admin.adminSaqueRecursos(ctx, alvoUser);
      if (sub === 'resetar') return admin.adminCidadeResetar(ctx, alvoUser, Boolean(interaction.options.getBoolean('confirmar')));
    }

    if (grupo === 'npc') {
      if (sub === 'convidar') return admin.adminNpcConvidar(ctx, alvoUser, interaction.options.getString('npc'));
      if (sub === 'resetarmemoria') return admin.adminNpcResetarMemoria(ctx, alvoUser, interaction.options.getString('quem'));
      if (sub === 'personalidade') {
        return admin.adminNpcPersonalidade(ctx, interaction.options.getString('npc'), {
          texto: interaction.options.getString('texto'),
          epoca: interaction.options.getString('epoca'),
          resetar: Boolean(interaction.options.getBoolean('resetar')),
        });
      }
      if (sub === 'liberar') return admin.adminNpcLiberar(ctx, alvoUser, interaction.options.getString('npc'));
    }

    if (grupo === 'roubo') {
      if (sub === 'limpar') return admin.adminRoubarLimpar(ctx, alvoUser);
    }

    if (grupo === 'sistema') {
      if (sub === 'anuncio') return admin.adminAnuncio(ctx, interaction.options.getString('mensagem'));
      if (sub === 'stats') return admin.adminStats(ctx);
    }

    await ctx.send({ content: 'Subcomando não reconhecido.' });
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const campo = interaction.options.getFocused(true).name;

    let choices = [];
    if (campo === 'carta') {
      choices = construirChoices(Object.values(CARDS), focused, c => `${c.emoji} ${c.nome} (${c.raridade})`, c => c.id);
    } else if (campo === 'armadura') {
      choices = construirChoices(listaArmaduras(), focused, a => `${a.emoji} ${a.nome} (${a.raridade})`, a => a.id);
    } else if (campo === 'perk') {
      choices = construirChoices(listaPerks(), focused, p => `${p.emoji} ${p.nome} (${p.tipo})`, p => p.id);
    } else if (campo === 'npc') {
      choices = construirChoices(getNPCS(), focused, n => `${n.emoji} ${n.nome}`, n => n.id);
    } else if (campo === 'quem') {
      const especiais = [
        { nome: 'todos (Thomas + Narrador + todos os moradores)', valor: 'todos' },
        { nome: 'narrador (só a memória do /ia)', valor: 'narrador' },
        { nome: 'taverneiro (só a memória do Thomas)', valor: 'taverneiro' },
      ];
      const itens = [...especiais, ...getNPCS().map(n => ({ nome: `${n.emoji} ${n.nome}`, valor: n.id }))];
      choices = construirChoices(itens, focused, i => i.nome, i => i.valor);
    }

    await interaction.respond(choices);
  },
};
