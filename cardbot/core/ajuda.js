const { EmbedBuilder } = require('discord.js');
const { ehAdmin } = require('../lib/adminAuth');

async function ajudaCore(ctx) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📖 Comandos do Bot')
    .setDescription('Todo comando funciona com `/` ou com o prefixo `;`. Os apelidos entre parênteses também funcionam.')
    .addFields(
      { name: '🏃 Aventura', value: [
        '`/perfil` (`;p`) — seu card de status',
        '`/explorar` (`;adv`, `;exp`, `;lutar`) — avança um andar na masmorra',
        '`/recolher` (`;sair`, `;bank`) — guarda as moedas da run e encerra com segurança',
      ].join('\n') },
      { name: '🃏 Cartas', value: [
        '`/inventario` (`;inv`, `;i`) — grade com suas cartas (com os nomes em texto também)',
        '`/carta <nome>` (`;carta <nome>`) — detalhes de uma carta específica',
        '`/raridades` (`;raridades`) — mostra as cartas por raridade com botões',
        '`/vender <nome>` (`;vender <nome> [qtd]`) — vende uma carta por moedas',
        '`/encantar <nome>` (`;encantar <nome>`) — consome cópias da carta + moedas pra deixá-la mais forte',
      ].join('\n') },
      { name: '🥋 Equipamento', value: [
        '`/armadura` (`;armadura`) — veja suas armaduras e equipe uma',
        'Armaduras reduzem % do dano recebido e aumentam sua vida máxima em batalhas e duelos.',
      ].join('\n') },
      { name: '✨ Perks', value: [
        '`/perks` (`;perks`, `;habilidades`) — veja suas perks e equipe uma passiva + uma ativa',
        'Passivas ficam ligadas o tempo todo (vida, dano, defesa, regeneração, vampirismo, crítico, sobrevivência).',
        'Ativas aparecem como um botão extra na batalha/duelo — usar não gasta o turno, mas só dá pra usar 1x por luta.',
        'Compre perks na `/loja` (categoria Perks).',
      ].join('\n') },
      { name: '🏰 Cassino Medieval', value: [
        '`/cassino dados aposta:100` (`;cassino dados 100`, `;cs dados 100`) — Jogo de Hazard, aposte nos dados',
        '`/cassino roleta aposta:100` (`;cassino roleta 100`) — gire a Roda da Fortuna',
        '`/cassino moeda aposta:100 escolha:cara` (`;cassino moeda 100 cara`) — Cara ou Coroa do Rei',
        'Use `all` ou `tudo` no lugar do valor pra apostar todo o seu saldo. Ex: `;cassino dados all`.',
        'Use `;cassino` sozinho para ver o cardápio completo de jogos e regras.',
      ].join('\n') },
      { name: '🏙️ Cidade', value: [
        '`/cidade` (`;cidade`, `;vila`) — funde e construa sua própria cidade',
        'Construa edifícios pra produzir recursos e ganhar pontos — a maior cidade aparece no ranking!',
      ].join('\n') },
      { name: '⚔️ Cartas de cura e defesa', value: [
        'Toda raridade agora tem cartas de **cura** (recuperam vida) e **defesa** (dão escudo), além das ofensivas.',
        'Quanto maior a raridade da carta, maior o valor de cura/escudo.',
      ].join('\n') },
      { name: '💰 Economia', value: [
        '`/saldo` (`;saldo`, `;moedas`) — quantas moedas você tem',
        '`/diario` (`;diario`, `;daily`) — recompensa diária',
        '`/loja` (`;loja`, `;shop`) — compra pacotes de cartas e armaduras (por categoria)',
        '`/dar <pessoa> <moedas ou carta>` (`;dar @pessoa 100`) — presenteia alguém',
      ].join('\n') },
      { name: '🤖 Chat Livre com o Bot (IA)', value: [
        '@mencione o bot em qualquer canal (ou manda DM pra ele) pra falar direto — ele tem personalidade própria (bem Geração Z, com gírias) e também serve como assistente de verdade: dúvidas, explicações, código, tradução, o que precisar.',
        'Ele também enxerga imagens: manda uma foto, print ou meme junto da mensagem (com ou sem legenda) que ele comenta ou ajuda com o que tá vendo (até 3 imagens por mensagem).',
        'Se um admin ligar `/chatia ligar` num canal, o bot passa a responder QUALQUER mensagem ali sozinho, sem precisar de @menção nem comando — até um admin pausar.',
      ].join('\n') },
      { name: '🍺 Taverneiro (IA)', value: [
        '`/taverneiro <mensagem>` (`;taverneiro`, `;npc`, `;falar`) — converse com o Thomas, o taverneiro da vila',
        'Ele tem personalidade própria (via IA) e pode te dar gorjetas em moedas ou um desconto na `/loja` se gostar da conversa — mas também pode não dar nada, ele não é bobo.',
        '`;taverneiro @pessoa <mensagem>` (ou a opção `sobre` no slash) — pergunte a opinião dele sobre outro cliente da taverna.',
        '`/clientes` (`;clientes`, `;fregueses`, `;vip`) — ranking dos clientes mais fiéis da taverna, com tiers (Frequês, Prata, Ouro, Lenda).',
      ].join('\n') },
      { name: '🏘️ Moradores da vila (IA)', value: [
        '`/convidar` (`;convidar`, `;recrutar`) — veja quem pode vir morar na sua vila (precisa ter fundado a cidade)',
        '`/convidar npc:<nome>` (`;convidar helena`) — convida um morador, gastando moedas',
        '`/morador npc:<nome> mensagem:...` (`;morador helena e aí?`) — converse com um morador convidado; cada um tem personalidade própria (IA) e memória da sua conversa, e pode te dar moedas/desconto se gostar de você',
        '`/taverna` (`;taverna`, `;cena`) — veja uma cena dos moradores da sua vila (e o Thomas) conversando entre si na taverna',
      ].join('\n') },
      { name: '🗡️ Roubo', value: [
        '`/roubar alvo:@pessoa` (`;roubar @pessoa`, `;assaltar`) — tenta roubar moedas da carteira de outro jogador',
        'Só funciona se a vítima tiver moedas soltas (o que está guardado no `/banco` é sempre protegido). Se falhar, você paga multa; se acertar, quem foi roubado fica protegido por um tempo.',
        'Armadura equipada reduz a chance de você ser roubado(a) — mais um motivo pra investir em `/armadura`.',
      ].join('\n') },
      { name: '🏦 Banco', value: [
        '`/banco` (`;banco`, `;cofre`) — veja o saldo do seu cofre na taverna',
        '`/banco depositar 100` (`;banco depositar 100`) — guarda moedas no cofre, protegidas de duelos, cassino e mortes na masmorra',
        '`/banco sacar 100` (`;banco sacar 100`) — retira moedas do cofre de volta pra carteira',
        'Moedas no cofre rendem juros diários enquanto ficam guardadas (use `tudo` no lugar da quantidade pra depositar/sacar tudo).',
      ].join('\n') },
      { name: '🔮 Mago Arcano e a masmorra', value: [
        '`/mago <carta>` (`;mago`, `;aldric`, `;feiticeiro`) — troque Fragmentos Arcanos por um Selo Arcano exclusivo em uma carta',
        'Fragmentos Arcanos são raros: aparecem ao vencer batalhas em andares mais profundos (4+) ou ajudando **Vulto**, um NPC preso que pode surgir durante `/explorar` a partir do andar 2.',
      ].join('\n') },
      { name: '⚔️ Social', value: [
        '`/duelo <pessoa>` (`;duelo @pessoa`) — desafia outro jogador para batalha',
        '`/top` (`;top`, `;ranking`) — ranking de moedas do bot',
      ].join('\n') },
    )
    .setFooter({ text: 'Dúvidas? É só chamar!' });

  if (ehAdmin(ctx)) {
    embed.addFields({ name: '🛠️ Admin', value: [
      '`/admin` (`;admin`) — painel de administração: ajustar moedas/banco/cartas/armaduras/perks/fragmentos de qualquer jogador, gerenciar cidade, forçar convite de moradores, resetar memória de IA, limpar roubo, anúncios e estatísticas do bot.',
      'Use `/admin` no Discord pra ver todos os grupos e subcomandos com autocomplete — é a forma mais fácil.',
      '`/chatia ligar` / `/chatia pausar` (`;chatia ligar`, `;chatia pausar`) — liga ou pausa o Chat Livre da IA (bot conversando sozinho, sem comando) num canal. `/chatia pausartudo` pausa em todos os canais do servidor de uma vez, e `/chatia status` mostra onde está ativo.',
    ].join('\n') });
  }

  await ctx.send({ embeds: [embed] });
}

module.exports = ajudaCore;
