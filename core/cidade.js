const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const { getPlayer, savePlayer, loadAll } = require('../db');
const {
  EDIFICIOS, RECURSOS_INFO, LOTE_CASTELO,
  edificiosConstruiveis, podePagar, primeiroLoteVazio,
  calcularProducaoPendente, calcularPontuacao, producaoTotalPorHora,
} = require('../game/city');
const { renderCidade } = require('../game/gui');

// Aplica a produção pendente (desde a última coleta) direto nos recursos da cidade
function coletarProducao(cidade) {
  const { producao, horas } = calcularProducaoPendente(cidade);
  for (const [recurso, qtd] of Object.entries(producao)) {
    cidade.recursos[recurso] = (cidade.recursos[recurso] || 0) + qtd;
  }
  cidade.ultimaColeta = Date.now();
  return { producao, horas };
}

function formatarCusto(custo) {
  return Object.entries(custo).map(([chave, valor]) => `${RECURSOS_INFO[chave].emoji} ${valor}`).join(' · ');
}

// O Discord rejeita a interação inteira (COMPONENT_INVALID_EMOJI) se o campo
// `emoji` de um componente vier vazio, com texto normal, ou com mais de um
// emoji junto — então, em vez de confiar cegamente no que foi cadastrado
// (inclusive pelo painel web), sempre passamos por aqui antes de usar.
function emojiSeguro(valor) {
  const texto = String(valor || '').trim();
  // Emoji "de verdade" costuma ter só 1-2 code points visíveis (às vezes com
  // variation selector ou ZWJ). Se vier vazio ou muito longo pra ser um único
  // emoji, cai no padrão — mais seguro do que deixar o Discord rejeitar tudo.
  if (!texto || [...texto].length > 4) return '🏗️';
  return texto;
}

function montarEmbedRecursos(player) {
  const { cidade } = player;
  const pontos = calcularPontuacao(cidade);
  const producaoHora = producaoTotalPorHora(cidade);

  const embed = new EmbedBuilder()
    .setColor(0x57c96b)
    .setTitle(cidade.fundada ? `🏙️ Cidade de ${player.username}` : '🏙️ Sua cidade ainda não foi fundada')
    .setImage('attachment://cidade.png');

  if (!cidade.fundada) {
    embed.setDescription(
      `Construa o **Castelo** no centro do mapa para fundar sua cidade e começar a colonização!\n\n` +
      `**Custo do Castelo:** ${formatarCusto(EDIFICIOS.castelo.custo)}\n` +
      `Você tem: ${formatarCusto(cidade.recursos)} · 🪙 ${player.moedas}`
    );
    return embed;
  }

  const moradores = Object.entries(player.npcs || {}).filter(([, estado]) => estado?.convidado);

  embed.setDescription(
    `⭐ **${pontos}** pontos de cidade — quanto mais e melhores edifícios, maior sua cidade no ranking!\n\n` +
    `**Recursos:** ${Object.entries(cidade.recursos).map(([r, v]) => `${RECURSOS_INFO[r].emoji} ${Math.floor(v)}`).join(' · ')}\n` +
    `**Produção/hora:** ${Object.entries(producaoHora).filter(([, v]) => v > 0).map(([r, v]) => `${RECURSOS_INFO[r].emoji} +${v}`).join(' · ') || 'nenhuma ainda'}\n\n` +
    `**Moradores convidados:** ${moradores.length > 0 ? moradores.length : 'nenhum ainda — use `/convidar` pra trazer gente pra sua vila!'}`
  );

  return embed;
}

function montarBotoesPrincipais(cidade) {
  const linha = new ActionRowBuilder();
  if (!cidade.fundada) {
    linha.addComponents(
      new ButtonBuilder().setCustomId('fundar_cidade').setLabel(`Fundar cidade (Castelo)`).setEmoji('🏰').setStyle(ButtonStyle.Success)
        .setDisabled(!podePagar(cidade.recursos, Infinity, EDIFICIOS.castelo.custo))
    );
    return [linha];
  }
  linha.addComponents(
    new ButtonBuilder().setCustomId('coletar_recursos').setLabel('Coletar recursos').setEmoji('📦').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ver_ranking').setLabel('Ranking de cidades').setEmoji('🏆').setStyle(ButtonStyle.Secondary),
  );
  const linhas = [linha];

  if (primeiroLoteVazio(cidade.grid) !== -1) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('construir_edificio')
      .setPlaceholder('🔨 Construir um edifício...')
      .addOptions(
        edificiosConstruiveis().map(ed => ({
          label: `${ed.nome} — ${formatarCusto(ed.custo)}`,
          description: `+${ed.pontos} pontos${Object.keys(ed.producaoHora).length ? ` · produz ${Object.entries(ed.producaoHora).map(([r, v]) => `${v} ${r}/h`).join(', ')}` : ''}`,
          value: ed.id,
          emoji: emojiSeguro(ed.emoji),
        }))
      );
    linhas.push(new ActionRowBuilder().addComponents(menu));
  } else {
    linhas.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cidade_lotada').setLabel('Cidade lotada! Sem lotes vazios').setStyle(ButtonStyle.Secondary).setDisabled(true)
    ));
  }

  return linhas;
}

async function montarPayload(ctx, player) {
  const pontos = calcularPontuacao(player.cidade);
  const buffer = await renderCidade(player.username, player.cidade, pontos);
  const attachment = new AttachmentBuilder(buffer, { name: 'cidade.png' });
  return {
    embeds: [montarEmbedRecursos(player)],
    files: [attachment],
    components: montarBotoesPrincipais(player.cidade),
  };
}

function montarRankingEmbed(ctx) {
  const todos = loadAll();
  const lista = Object.entries(todos)
    .filter(([, p]) => p.cidade?.fundada)
    .map(([id, p]) => ({ id, username: p.username, pontos: calcularPontuacao(p.cidade) }))
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 10);

  if (lista.length === 0) {
    return new EmbedBuilder().setColor(0x57c96b).setTitle('🏆 Ranking de Cidades').setDescription('Nenhuma cidade fundada ainda. Seja o primeiro colonizador!');
  }

  const medalhas = ['🥇', '🥈', '🥉'];
  const linhas = lista.map((p, i) => {
    const posicao = medalhas[i] || `**${i + 1}.**`;
    const destaque = p.id === ctx.userId ? ' ⬅️ você' : '';
    return `${posicao} **${p.username}** — ⭐ ${p.pontos} pontos${destaque}`;
  });

  return new EmbedBuilder().setColor(0x57c96b).setTitle('🏆 Ranking de Cidades (maiores do bot)').setDescription(linhas.join('\n'));
}

async function cidadeCore(ctx) {
  let player = getPlayer(ctx.userId, ctx.username);

  if (player.cidade.fundada) {
    coletarProducao(player.cidade);
    savePlayer(ctx.userId, player);
  }

  const msg = await ctx.send(await montarPayload(ctx, player));
  const collector = msg.createMessageComponentCollector({ time: 90_000 });

  collector.on('collect', async i => {
    if (i.user.id !== ctx.userId) {
      await i.reply({ content: 'Essa cidade não é sua! Use `/cidade` para ver a sua.', ephemeral: true });
      return;
    }

    player = getPlayer(ctx.userId, ctx.username);

    if (i.customId === 'fundar_cidade') {
      if (!podePagar(player.cidade.recursos, player.moedas, EDIFICIOS.castelo.custo)) {
        await i.reply({ content: '❌ Recursos insuficientes para fundar a cidade.', ephemeral: true });
        return;
      }
      for (const [chave, valor] of Object.entries(EDIFICIOS.castelo.custo)) {
        if (chave === 'moedas') player.moedas -= valor;
        else player.cidade.recursos[chave] -= valor;
      }
      player.cidade.grid[LOTE_CASTELO] = 'castelo';
      player.cidade.fundada = true;
      player.cidade.ultimaColeta = Date.now();
      savePlayer(ctx.userId, player);
      await i.update(await montarPayload(ctx, player));
      await i.followUp({ content: '🏰 Sua cidade foi fundada! Agora construa edifícios pra fazê-la crescer.' });
      return;
    }

    if (i.customId === 'coletar_recursos') {
      const { producao, horas } = coletarProducao(player.cidade);
      savePlayer(ctx.userId, player);
      const total = Object.values(producao).reduce((s, v) => s + v, 0);
      await i.update(await montarPayload(ctx, player));
      if (total > 0) {
        const texto = Object.entries(producao).filter(([, v]) => v > 0).map(([r, v]) => `${RECURSOS_INFO[r].emoji} +${v}`).join(' · ');
        await i.followUp({ content: `📦 Você coletou (${horas.toFixed(1)}h de produção): ${texto}` });
      } else {
        await i.followUp({ content: '📦 Ainda não há recursos novos pra coletar. Construa edifícios de produção ou espere um pouco!', ephemeral: true });
      }
      return;
    }

    if (i.customId === 'ver_ranking') {
      await i.reply({ embeds: [montarRankingEmbed(ctx)], ephemeral: true });
      return;
    }

    if (i.customId === 'construir_edificio') {
      const edificioId = i.values[0];
      const edificio = EDIFICIOS[edificioId];
      if (!edificio) return;

      if (!podePagar(player.cidade.recursos, player.moedas, edificio.custo)) {
        await i.reply({ content: `❌ Recursos insuficientes para construir ${edificio.nome}.`, ephemeral: true });
        return;
      }
      const lote = primeiroLoteVazio(player.cidade.grid);
      if (lote === -1) {
        await i.reply({ content: '❌ Sua cidade não tem mais lotes vazios!', ephemeral: true });
        return;
      }

      for (const [chave, valor] of Object.entries(edificio.custo)) {
        if (chave === 'moedas') player.moedas -= valor;
        else player.cidade.recursos[chave] -= valor;
      }
      player.cidade.grid[lote] = edificioId;
      savePlayer(ctx.userId, player);

      await i.update(await montarPayload(ctx, player));
      await i.followUp({ content: `${edificio.emoji} **${edificio.nome}** construído! (+${edificio.pontos} pontos de cidade)` });
      return;
    }
  });

  collector.on('end', async () => {
    try { await msg.edit({ components: [] }); } catch { /* mensagem pode já ter sido apagada */ }
  });
}

module.exports = cidadeCore;
