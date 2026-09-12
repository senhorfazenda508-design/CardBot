const perfilCore = require('../core/perfil');
const saldoCore = require('../core/saldo');
const diarioCore = require('../core/diario');
const inventarioCore = require('../core/inventario');
const lojaCore = require('../core/loja');
const explorarCore = require('../core/explorar');
const recolherCore = require('../core/recolher');
const ajudaCore = require('../core/ajuda');
const cartaCore = require('../core/carta');
const venderCore = require('../core/vender');
const darCore = require('../core/dar');
const duelCore = require('../core/duelo');
const topCore = require('../core/top');
const armaduraCore = require('../core/armadura');
const encantarCore = require('../core/encantar');
const cidadeCore = require('../core/cidade');
const perksCore = require('../core/perks');
const cassinoCore = require('../core/cassino');
const taverneiroCore = require('../core/taverneiro');
const iaCore = require('../core/ia');
const personalidadeCore = require('../core/personalidade');
const bancoCore = require('../core/banco');
const magoCore = require('../core/mago');
const clientesCore = require('../core/clientes');
const convidarCore = require('../core/convidar');
const moradorCore = require('../core/morador');
const tavernaCore = require('../core/taverna');
const roubarCore = require('../core/roubar');
const admin = require('../core/admin');
const raridadesCore = require('../core/raridades');
const chatia = require('../core/chatia');
const charuma = require('../core/charuma');

// Extrai o texto depois do comando (sem prefixo, sem o nome do comando)
function textoRestante(message) {
  const semPrefixo = message.content.slice(1).trim(); // remove ";"
  const partes = semPrefixo.split(/\s+/);
  partes.shift(); // remove o nome do comando
  return partes.join(' ').trim();
}

// Constrói um "alvoUser" a partir da primeira menção da mensagem
function alvoMencionado(message) {
  const user = message.mentions.users.first();
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    avatarURL: user.displayAvatarURL({ extension: 'png', size: 256 }),
    bot: user.bot,
  };
}

// Remove a menção (<@123> ou <@!123>) do texto, sobrando só o resto
function textoSemMencao(texto) {
  return texto.replace(/<@!?\d+>/g, '').trim();
}

// Cada comando: lista de apelidos + função que recebe (ctx, message) e executa
const PREFIX_COMMANDS = {
  perfil: { aliases: ['perfil', 'profile', 'p'], run: ctx => perfilCore(ctx) },
  saldo: { aliases: ['saldo', 'money', 'moedas', 's'], run: ctx => saldoCore(ctx) },
  diario: { aliases: ['diario', 'daily', 'dia'], run: ctx => diarioCore(ctx) },
  inventario: { aliases: ['inventario', 'inv', 'i', 'mochila'], run: ctx => inventarioCore(ctx) },
  loja: { aliases: ['loja', 'shop', 'loj', 'l'], run: ctx => lojaCore(ctx) },
  explorar: { aliases: ['explorar', 'adv', 'exp', 'batalha', 'lutar', 'e'], run: ctx => explorarCore(ctx) },
  recolher: { aliases: ['recolher', 'sair', 'bank', 'r'], run: ctx => recolherCore(ctx) },
  ajuda: { aliases: ['ajuda', 'help', 'comandos', 'a', '?'], run: ctx => ajudaCore(ctx) },
  raridades: { aliases: ['raridades', 'raridade', 'rari', 'catalogo'], run: ctx => raridadesCore(ctx) },
  carta: {
    aliases: ['carta', 'card', 'c'],
    run: (ctx, message) => cartaCore(ctx, textoRestante(message)),
  },
  vender: {
    aliases: ['vender', 'sell', 'v'],
    run: (ctx, message) => {
      const texto = textoRestante(message);
      const partes = texto.split(/\s+/);
      const ultima = partes[partes.length - 1];
      const temQuantidade = /^\d+$/.test(ultima) && partes.length > 1;
      const quantidade = temQuantidade ? parseInt(ultima, 10) : 1;
      const termo = temQuantidade ? partes.slice(0, -1).join(' ') : texto;
      return venderCore(ctx, termo, quantidade);
    },
  },
  dar: {
    aliases: ['dar', 'presentear', 'gift', 'g'],
    run: (ctx, message) => {
      const alvo = alvoMencionado(message);
      const entrada = textoSemMencao(textoRestante(message));
      return darCore(ctx, alvo, entrada);
    },
  },
  duelo: {
    aliases: ['duelo', 'duel', 'desafiar', 'du'],
    run: (ctx, message) => {
      const alvo = alvoMencionado(message);
      return duelCore(ctx, alvo);
    },
  },
  top: { aliases: ['top', 'ranking', 'rank', 't'], run: ctx => topCore(ctx) },
  armadura: { aliases: ['armadura', 'armor', 'equipar', 'ar'], run: ctx => armaduraCore(ctx) },
  encantar: {
    aliases: ['encantar', 'enchant', 'en'],
    run: (ctx, message) => encantarCore(ctx, textoRestante(message)),
  },
  cidade: { aliases: ['cidade', 'vila', 'cid', 'city'], run: ctx => cidadeCore(ctx) },
  perks: { aliases: ['perks', 'perk', 'habilidades', 'pk'], run: ctx => perksCore(ctx) },
  cassino: {
    aliases: ['cassino', 'casino', 'apostar', 'cs'],
    run: (ctx, message) => {
      const partes = textoRestante(message).split(/\s+/).filter(Boolean);
      const [jogo, aposta, escolha] = partes;
      return cassinoCore(ctx, jogo, aposta, escolha);
    },
  },
  taverneiro: {
    aliases: ['taverneiro', 'npc', 'falar', 'thomas', 'tv'],
    run: (ctx, message) => {
      const alvo = alvoMencionado(message);
      const texto = textoSemMencao(textoRestante(message));
      return taverneiroCore(ctx, texto, alvo);
    },
  },
  banco: {
    aliases: ['banco', 'bank', 'cofre'],
    run: (ctx, message) => {
      const partes = textoRestante(message).split(/\s+/).filter(Boolean);
      const [acao, quantidade] = partes;
      return bancoCore(ctx, acao, quantidade);
    },
  },
  mago: {
    aliases: ['mago', 'aldric', 'feiticeiro'],
    run: (ctx, message) => magoCore(ctx, textoRestante(message)),
  },
  clientes: {
    aliases: ['clientes', 'fregueses', 'vip'],
    run: ctx => clientesCore(ctx),
  },
  ia: {
    aliases: ['ia', 'narrador', 'ai'],
    run: (ctx, message) => iaCore(ctx, textoRestante(message)),
  },
  personalidade: {
    aliases: ['personalidade', 'persona', 'iapersona'],
    run: (ctx, message) => {
      const texto = textoRestante(message);
      const partes = texto.split(/\s+/);
      const acao = (partes[0] || 'ver').toLowerCase();
      const resto = partes.slice(1).join(' ');
      return personalidadeCore(ctx, acao, resto);
    },
  },
  convidar: {
    aliases: ['convidar', 'convite', 'recrutar'],
    run: (ctx, message) => convidarCore(ctx, textoRestante(message)),
  },
  morador: {
    aliases: ['morador', 'vizinho'],
    run: (ctx, message) => {
      const alvo = alvoMencionado(message);
      const texto = textoSemMencao(textoRestante(message));
      const partes = texto.split(/\s+/);
      const npc = partes.shift() || '';
      const mensagem = partes.join(' ');
      return moradorCore(ctx, npc, mensagem, alvo);
    },
  },
  taverna: {
    aliases: ['taverna', 'tavernaviva', 'cena'],
    run: ctx => tavernaCore(ctx),
  },
  roubar: {
    aliases: ['roubar', 'roubo', 'assaltar'],
    run: (ctx, message) => {
      const alvo = alvoMencionado(message);
      return roubarCore(ctx, alvo);
    },
  },
  admin: {
    aliases: ['admin', 'painel'],
    run: (ctx, message) => {
      const alvo = alvoMencionado(message);
      const texto = textoSemMencao(textoRestante(message));
      const partes = texto.split(/\s+/).filter(Boolean);
      const grupo = (partes.shift() || '').toLowerCase();
      const sub = (partes.shift() || '').toLowerCase();
      const resto = partes.join(' ');
      const confirmar = ['sim', 'confirmar', 'confirmo', 'true'].includes(resto.trim().toLowerCase());

      function popNumeroFinal(txt) {
        const p = txt.trim().split(/\s+/).filter(Boolean);
        const ultimo = p[p.length - 1];
        const n = Number(ultimo);
        if (p.length > 0 && ultimo !== undefined && Number.isFinite(n)) {
          p.pop();
          return { texto: p.join(' '), numero: Math.trunc(n) };
        }
        return { texto: txt.trim(), numero: null };
      }

      if (grupo === 'jogador') {
        if (sub === 'moedas') return admin.adminMoedas(ctx, alvo, Math.trunc(Number(resto)));
        if (sub === 'banco') return admin.adminBanco(ctx, alvo, Math.trunc(Number(resto)));
        if (sub === 'carta') { const r = popNumeroFinal(resto); return admin.adminCarta(ctx, alvo, r.texto, r.numero || 1); }
        if (sub === 'removercarta') { const r = popNumeroFinal(resto); return admin.adminRemoverCarta(ctx, alvo, r.texto, r.numero || 1); }
        if (sub === 'armadura') return admin.adminArmadura(ctx, alvo, resto);
        if (sub === 'perk') return admin.adminPerk(ctx, alvo, resto);
        if (sub === 'fragmentos') return admin.adminFragmentos(ctx, alvo, Math.trunc(Number(resto)));
        if (sub === 'perfil') return admin.adminPerfilDebug(ctx, alvo);
        if (sub === 'resetar') return admin.adminResetarJogador(ctx, alvo, confirmar);
      }
      if (grupo === 'cidade') {
        if (sub === 'recursos') {
          const p2 = resto.split(/\s+/).filter(Boolean);
          const recurso = (p2.shift() || '').toLowerCase();
          return admin.adminCidadeRecursos(ctx, alvo, recurso, Math.trunc(Number(p2.join(' '))));
        }
        if (sub === 'saque') return admin.adminSaqueRecursos(ctx, alvo);
        if (sub === 'resetar') return admin.adminCidadeResetar(ctx, alvo, confirmar);
      }
      if (grupo === 'npc') {
        if (sub === 'convidar') return admin.adminNpcConvidar(ctx, alvo, resto);
        if (sub === 'resetarmemoria') return admin.adminNpcResetarMemoria(ctx, alvo, resto);
        if (sub === 'liberar') return admin.adminNpcLiberar(ctx, alvo, resto);
        if (sub === 'personalidade') {
          // ";admin npc personalidade <npcId> resetar" ou
          // ";admin npc personalidade <npcId> [epoca: <ano>] <texto livre>"
          const p2 = resto.trim().split(/\s+/);
          const npcId = p2.shift() || '';
          const restoTexto = p2.join(' ').trim();
          if (/^resetar$/i.test(restoTexto)) {
            return admin.adminNpcPersonalidade(ctx, npcId, { resetar: true });
          }
          const matchEpoca = restoTexto.match(/epoca:\s*([^\n]+)$/i);
          const epoca = matchEpoca ? matchEpoca[1].trim() : null;
          const texto = matchEpoca ? restoTexto.slice(0, matchEpoca.index).trim() : restoTexto;
          return admin.adminNpcPersonalidade(ctx, npcId, { texto: texto || null, epoca });
        }
      }
      if (grupo === 'roubo' && sub === 'limpar') return admin.adminRoubarLimpar(ctx, alvo);
      if (grupo === 'sistema') {
        if (sub === 'anuncio') return admin.adminAnuncio(ctx, resto);
        if (sub === 'stats') return admin.adminStats(ctx);
      }

      return ctx.send({
        content:
          'Uso: `;admin <grupo> <subcomando> [@usuario] [args]`.\n' +
          'Grupos: `jogador` (moedas/banco/carta/removercarta/armadura/perk/fragmentos/perfil/resetar), `cidade` (recursos/saque/resetar), `npc` (convidar/resetarmemoria/liberar/personalidade), `roubo` (limpar), `sistema` (anuncio/stats).\n' +
          'Ex: `;admin npc personalidade helena seja mais rude epoca: 1920` ou `;admin npc personalidade helena resetar`.\n' +
          'Dica: `/admin` (slash command) é mais fácil de usar, com autocomplete de cada opção.',
      });
    },
  },
  chatia: {
    aliases: ['chatia', 'chat', 'iabot', 'botia'],
    run: (ctx, message) => {
      const texto = textoRestante(message);
      const partes = texto.split(/\s+/).filter(Boolean);
      const sub = (partes.shift() || 'status').toLowerCase();
      const canalMencionado = message.mentions.channels.first();
      const canalId = canalMencionado ? canalMencionado.id : message.channelId;

      if (['ligar', 'on', 'ativar', 'ativa'].includes(sub)) return chatia.chatiaLigar(ctx, canalId);
      if (['pausar', 'off', 'desligar', 'desliga'].includes(sub)) return chatia.chatiaPausar(ctx, canalId);
      if (['pausartudo', 'pausargeral', 'offtudo'].includes(sub)) return chatia.chatiaPausarTudo(ctx);
      if (sub === 'status') return chatia.chatiaStatus(ctx);

      return ctx.send({
        content:
          'Uso: `;chatia ligar [#canal]` (ativa o bot respondendo tudo naquele canal), `;chatia pausar [#canal]`, ' +
          '`;chatia pausartudo` (pausa em todos os canais do servidor de uma vez) ou `;chatia status`.\n' +
          'Sem canal ligado, ainda dá pra falar comigo @mencionando em qualquer canal, ou em DM.',
      });
    },
  },
  charuma: {
    aliases: ['charuma'],
    run: (ctx, message) => {
      const texto = textoRestante(message);
      const sub = (texto.split(/\s+/)[0] || 'iniciar').toLowerCase();

      if (['parar', 'stop', 'pausar', 'off', 'desligar'].includes(sub)) return charuma.charumaParar(ctx, message);
      return charuma.charumaIniciar(ctx, message);
    },
  },
};

// Constrói um mapa reverso: apelido -> definição do comando
const ALIAS_MAP = {};
for (const cmd of Object.values(PREFIX_COMMANDS)) {
  for (const alias of cmd.aliases) {
    ALIAS_MAP[alias] = cmd;
  }
}

module.exports = { ALIAS_MAP, PREFIX_COMMANDS };
