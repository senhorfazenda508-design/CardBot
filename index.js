require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { fromMessage } = require('./lib/adapter');
const { ALIAS_MAP } = require('./lib/prefixCommands');
const { flushSync } = require('./db');
const chatBotIA = require('./game/chatBotIA');

const PREFIX = ';';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages, // necessário pro Chat Livre da IA responder também em DM
    GatewayIntentBits.MessageContent, // necessário para ler o texto e reconhecer o prefixo ";"
  ],
  partials: [Partials.Channel], // canais de DM não ficam em cache — sem isso o evento nem chega
});
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('clientReady', () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  escreverHeartbeat();
  setInterval(escreverHeartbeat, 15_000);
});

// Escreve um "sinal de vida" periódico em disco pra o painel web (que roda
// num processo separado, sem acesso direto ao client do Discord) saber se o
// bot está online, há quanto tempo, em quantos servidores e com que ping.
const iniciadoEm = Date.now();
const HEARTBEAT_PATH = path.join(__dirname, 'data', 'heartbeat.json');
function escreverHeartbeat() {
  try {
    const dados = {
      ts: Date.now(),
      tag: client.user?.tag || null,
      servidores: client.guilds.cache.size,
      ping: client.ws.ping,
      iniciadoEm,
    };
    fs.writeFile(HEARTBEAT_PATH, JSON.stringify(dados, null, 2), () => {});
  } catch {}
}

// Rede de segurança: loga qualquer erro que escape dos try/catch normais
// (em vez de deixar o processo travado ou falhar sem explicação nenhuma)
process.on('unhandledRejection', err => {
  console.error('Unhandled rejection:', err);
});

// Garante que a última escrita "atrasada" do db.js (ver comentário lá) vai
// pro disco antes do processo morrer de vez (Ctrl+C, restart do PM2, etc.).
function encerrarComCalma(sinal) {
  console.log(`\n${sinal} recebido, salvando dados pendentes antes de encerrar...`);
  try { flushSync(); } catch (err) { console.error('Erro ao salvar antes de encerrar:', err); }
  process.exit(0);
}
process.on('SIGINT', () => encerrarComCalma('SIGINT'));
process.on('SIGTERM', () => encerrarComCalma('SIGTERM'));

// ---- Autocomplete (sugestões de nome/id enquanto o jogador digita) ----
client.on('interactionCreate', async interaction => {
  if (!interaction.isAutocomplete()) return;

  console.log(`[DEBUG] Autocomplete recebido: /${interaction.commandName} campo="${interaction.options.getFocused(true).name}" digitado="${interaction.options.getFocused()}"`);

  // Intercepta o .respond() só pra logar o que está sendo mandado (debug).
  const respondOriginal = interaction.respond.bind(interaction);
  interaction.respond = async choices => {
    console.log(`[DEBUG] Enviando ${choices.length} opção(ões):`, JSON.stringify(choices));
    return respondOriginal(choices);
  };

  const command = client.commands.get(interaction.commandName);
  if (!command || typeof command.autocomplete !== 'function') {
    console.log(`[DEBUG] Comando /${interaction.commandName} não tem função autocomplete() — ignorando.`);
    return;
  }

  try {
    await command.autocomplete(interaction);
    console.log(`[DEBUG] Respondido com sucesso pra /${interaction.commandName}.`);
  } catch (err) {
    console.error(`[DEBUG] Erro no autocomplete de /${interaction.commandName}:`, err);
    // Autocomplete não aceita reply de erro normal; só evita deixar a Promise
    // rejeitada sem tratamento. Se já não respondeu, manda lista vazia.
    if (!interaction.responded) {
      await interaction.respond([]).catch(() => {});
    }
  }
});

// ---- Slash commands ----
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Erro ao executar /${interaction.commandName}:`, err);
    const payload = { content: '❌ Ocorreu um erro ao executar esse comando.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

// ---- Comandos com prefixo (;perfil, ;adv, etc.) + Chat Livre da IA ----
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content.startsWith(PREFIX)) {
    const semPrefixo = message.content.slice(PREFIX.length).trim();
    const [nomeComando] = semPrefixo.split(/\s+/);
    if (!nomeComando) return;

    const core = ALIAS_MAP[nomeComando.toLowerCase()];
    if (!core) return; // não é um comando conhecido, ignora silenciosamente

    try {
      await core.run(fromMessage(message), message);
    } catch (err) {
      console.error(`Erro ao executar ;${nomeComando}:`, err);
      await message.channel.send('❌ Ocorreu um erro ao executar esse comando.').catch(() => {});
    }
    return;
  }

  // Não é comando com prefixo — passa pro Chat Livre da IA (game/chatBotIA.js),
  // que decide sozinho se deve responder: canal ligado por um admin via
  // /chatia, @menção direta em qualquer canal, ou DM. Se não for nenhum
  // desses casos, a função simplesmente não faz nada.
  try {
    await chatBotIA.tentarResponder(message, client);
  } catch (err) {
    console.error('Erro no Chat Livre da IA:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
