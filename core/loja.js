const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../db');
const { sortearCarta, RARIDADE_COR } = require('../game/cards');
const { ARMADURAS, listaArmaduras, RARIDADE_COR_HEX } = require('../game/armor');
const { PERKS, listaPerks, RARIDADE_COR_HEX: PERK_COR_HEX } = require('../game/perks');
const { descontoAtivo, consumirDesconto } = require('../game/ai');

// Aplica o % de desconto (arredondado pra baixo) e nunca deixa o preço ir a zero.
function comDesconto(preco, pct) {
  if (!pct) return preco;
  return Math.max(1, Math.round(preco * (1 - pct / 100)));
}

const PACOTES = {
  pacote_comum: { nome: 'Pacote Comum', emoji: '⚪', preco: 50, pesos: { Comum: 70, Incomum: 25, Raro: 5 } },
  pacote_raro: { nome: 'Pacote Raro', emoji: '🔵', preco: 150, pesos: { Comum: 30, Incomum: 30, Raro: 32, Épico: 8 } },
  pacote_epico: { nome: 'Pacote Épico', emoji: '🟣', preco: 400, pesos: { Comum: 10, Incomum: 15, Raro: 35, Épico: 33, Lendário: 7 } },
  pacote_lendario: { nome: 'Pacote Lendário', emoji: '🟡', preco: 900, pesos: { Raro: 15, Épico: 40, Lendário: 40, Mítico: 5 } },
  pacote_mitico: { nome: 'Pacote Mítico', emoji: '💠', preco: 2000, pesos: { Épico: 20, Lendário: 45, Mítico: 32, Ancestral: 3 } },
  pacote_ancestral: { nome: 'Pacote Ancestral', emoji: '🔴', preco: 4500, pesos: { Lendário: 20, Mítico: 55, Ancestral: 25 } },
};

const CATEGORIAS = {
  pacotes: { label: 'Pacotes de Cartas', emoji: '🃏' },
  armaduras: { label: 'Armaduras', emoji: '🥋' },
  perks: { label: 'Perks', emoji: '✨' },
};

// ---------- Categoria: Pacotes ----------
function montarEmbedPacotes(moedas, desconto) {
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('🏪 Loja — Pacotes de Cartas')
    .setDescription(
      `Você tem **${moedas}** moedas.\nEscolha um pacote para comprar e abrir uma carta aleatória.` +
      (desconto ? `\n🏷️ Desconto do Taverneiro ativo: **${desconto}%**` : '')
    );

  for (const p of Object.values(PACOTES)) {
    const precoFinal = comDesconto(p.preco, desconto);
    const chances = Object.entries(p.pesos).map(([rar, peso]) => `${rar} ${peso}%`).join(' · ');
    const precoLabel = desconto ? `~~${p.preco}~~ **${precoFinal}**` : `${p.preco}`;
    embed.addFields({ name: `${p.emoji} ${p.nome} — ${precoLabel}`, value: chances });
  }
  return embed;
}

function montarBotoesPacotes(moedas, desconto) {
  const entradas = Object.entries(PACOTES);
  const linhas = [];
  for (let i = 0; i < entradas.length; i += 3) {
    const row = new ActionRowBuilder();
    for (const [id, p] of entradas.slice(i, i + 3)) {
      const precoFinal = comDesconto(p.preco, desconto);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(id)
          .setLabel(`${p.nome} (${precoFinal})`)
          .setEmoji(p.emoji)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(moedas < precoFinal)
      );
    }
    linhas.push(row);
  }
  return linhas;
}

// ---------- Categoria: Armaduras ----------
function montarEmbedArmaduras(player, desconto) {
  const embed = new EmbedBuilder()
    .setColor(0x4aa9e0)
    .setTitle('🏪 Loja — Armaduras')
    .setDescription(
      `Você tem **${player.moedas}** moedas.\nArmaduras são equipamento permanente — compre uma vez e equipe em \`/armadura\`.` +
      (desconto ? `\n🏷️ Desconto do Taverneiro ativo: **${desconto}%**` : '')
    );

  for (const a of listaArmaduras()) {
    const possui = player.armaduras.includes(a.id) ? ' ✅ *(já possui)*' : '';
    const precoFinal = comDesconto(a.preco, desconto);
    const precoLabel = desconto && !possui ? `~~${a.preco}~~ **${precoFinal}**` : `${a.preco}`;
    embed.addFields({
      name: `${a.emoji} ${a.nome} (${a.raridade}) — ${precoLabel}${possui}`,
      value: `🛡️ Reduz ${Math.round(a.defesa * 100)}% do dano · ❤️ +${a.vida} de vida`,
    });
  }
  return embed;
}

function montarBotoesArmaduras(player, desconto) {
  const entradas = listaArmaduras();
  const linhas = [];
  for (let i = 0; i < entradas.length; i += 3) {
    const row = new ActionRowBuilder();
    for (const a of entradas.slice(i, i + 3)) {
      const jaTem = player.armaduras.includes(a.id);
      const precoFinal = comDesconto(a.preco, desconto);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`armadura_${a.id}`)
          .setLabel(jaTem ? `${a.nome} (adquirida)` : `${a.nome} (${precoFinal})`)
          .setEmoji(a.emoji)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(jaTem || player.moedas < precoFinal)
      );
    }
    linhas.push(row);
  }
  return linhas;
}

// ---------- Categoria: Perks ----------
function montarEmbedPerks(player, desconto) {
  const embed = new EmbedBuilder()
    .setColor(0xc04af0)
    .setTitle('🏪 Loja — Perks')
    .setDescription(
      `Você tem **${player.moedas}** moedas.\n` +
      'Perks são equipamento permanente extra (além de armadura). Compre e depois equipe em `/perks` — 1 passiva (sempre ativa) + 1 ativa (usável 1x por batalha/duelo).\n\n' +
      '**🔵 Passivas** ficam ligadas o tempo todo. **🟠 Ativas** aparecem como um botão extra na batalha/duelo, sem gastar o turno.' +
      (desconto ? `\n\n🏷️ Desconto do Taverneiro ativo: **${desconto}%**` : '')
    );

  for (const p of listaPerks()) {
    const possui = player.perks.includes(p.id) ? ' ✅ *(já possui)*' : '';
    const tipoIcone = p.tipo === 'passiva' ? '🔵' : '🟠';
    const precoFinal = comDesconto(p.preco, desconto);
    const precoLabel = desconto && !possui ? `~~${p.preco}~~ **${precoFinal}**` : `${p.preco}`;
    embed.addFields({
      name: `${p.emoji} ${p.nome} (${p.raridade}) — ${precoLabel}${possui}`,
      value: `${tipoIcone} ${p.tipo === 'passiva' ? 'Passiva' : 'Ativa'} · ${p.descricao}`,
    });
  }
  return embed;
}

function montarBotoesPerks(player, desconto) {
  const entradas = listaPerks();
  const linhas = [];
  for (let i = 0; i < entradas.length; i += 3) {
    const row = new ActionRowBuilder();
    for (const p of entradas.slice(i, i + 3)) {
      const jaTem = player.perks.includes(p.id);
      const precoFinal = comDesconto(p.preco, desconto);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`perk_${p.id}`)
          .setLabel(jaTem ? `${p.nome} (adquirida)` : `${p.nome} (${precoFinal})`)
          .setEmoji(p.emoji)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(jaTem || player.moedas < precoFinal)
      );
    }
    linhas.push(row);
  }
  return linhas;
}

// ---------- Seletor de categoria (comum às duas) ----------
function montarSeletorCategoria(categoriaAtual) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('loja_categoria')
    .setPlaceholder('Escolha uma categoria da loja')
    .addOptions(
      Object.entries(CATEGORIAS).map(([id, c]) => ({
        label: c.label,
        value: id,
        emoji: c.emoji,
        default: id === categoriaAtual,
      }))
    );
  return new ActionRowBuilder().addComponents(menu);
}

function montarPayload(categoria, player) {
  const desconto = descontoAtivo(player);
  if (categoria === 'armaduras') {
    return {
      embeds: [montarEmbedArmaduras(player, desconto)],
      components: [montarSeletorCategoria(categoria), ...montarBotoesArmaduras(player, desconto)],
    };
  }
  if (categoria === 'perks') {
    return {
      embeds: [montarEmbedPerks(player, desconto)],
      components: [montarSeletorCategoria(categoria), ...montarBotoesPerks(player, desconto)],
    };
  }
  return {
    embeds: [montarEmbedPacotes(player.moedas, desconto)],
    components: [montarSeletorCategoria(categoria), ...montarBotoesPacotes(player.moedas, desconto)],
  };
}

async function lojaCore(ctx) {
  let categoria = 'pacotes';
  let player = getPlayer(ctx.userId, ctx.username);

  const msg = await ctx.send(montarPayload(categoria, player));
  const collector = msg.createMessageComponentCollector({ time: 60_000 });

  collector.on('collect', async i => {
    if (i.user.id !== ctx.userId) {
      await i.reply({ content: 'Essa loja não é sua! Use `/loja` ou `;loja` para abrir a sua.', ephemeral: true });
      return;
    }

    player = getPlayer(ctx.userId, ctx.username);

    // Troca de categoria
    if (i.customId === 'loja_categoria') {
      categoria = i.values[0];
      await i.update(montarPayload(categoria, player));
      return;
    }

    // Compra de armadura
    if (i.customId.startsWith('armadura_')) {
      const id = i.customId.replace('armadura_', '');
      const armadura = ARMADURAS[id];
      if (!armadura) return;
      if (player.armaduras.includes(id)) {
        await i.reply({ content: 'Você já possui essa armadura.', ephemeral: true });
        return;
      }
      const precoArmadura = comDesconto(armadura.preco, descontoAtivo(player));
      if (player.moedas < precoArmadura) {
        await i.reply({ content: '❌ Moedas insuficientes.', ephemeral: true });
        return;
      }
      player.moedas -= precoArmadura;
      player.armaduras.push(id);
      consumirDesconto(player);
      savePlayer(ctx.userId, player);

      await i.update(montarPayload(categoria, player));
      const resultado = new EmbedBuilder()
        .setColor(RARIDADE_COR_HEX[armadura.raridade])
        .setTitle('🥋 Armadura adquirida!')
        .setDescription(`Você comprou ${armadura.emoji} **${armadura.nome}**!\nUse \`/armadura\` (ou \`;armadura\`) para equipá-la.`)
        .setFooter({ text: `Saldo restante: ${player.moedas} moedas` });
      await i.followUp({ embeds: [resultado] });
      return;
    }

    // Compra de perk
    if (i.customId.startsWith('perk_')) {
      const id = i.customId.replace('perk_', '');
      const perk = PERKS[id];
      if (!perk) return;
      if (player.perks.includes(id)) {
        await i.reply({ content: 'Você já possui essa perk.', ephemeral: true });
        return;
      }
      const precoPerk = comDesconto(perk.preco, descontoAtivo(player));
      if (player.moedas < precoPerk) {
        await i.reply({ content: '❌ Moedas insuficientes.', ephemeral: true });
        return;
      }
      player.moedas -= precoPerk;
      player.perks.push(id);
      consumirDesconto(player);
      savePlayer(ctx.userId, player);

      await i.update(montarPayload(categoria, player));
      const resultado = new EmbedBuilder()
        .setColor(PERK_COR_HEX[perk.raridade])
        .setTitle('✨ Perk adquirida!')
        .setDescription(`Você comprou ${perk.emoji} **${perk.nome}**!\nUse \`/perks\` (ou \`;perks\`) para equipá-la.`)
        .setFooter({ text: `Saldo restante: ${player.moedas} moedas` });
      await i.followUp({ embeds: [resultado] });
      return;
    }

    // Compra de pacote de cartas
    const pacote = PACOTES[i.customId];
    if (!pacote) return;

    const precoPacote = comDesconto(pacote.preco, descontoAtivo(player));
    if (player.moedas < precoPacote) {
      await i.reply({ content: '❌ Moedas insuficientes.', ephemeral: true });
      return;
    }

    player.moedas -= precoPacote;
    const carta = sortearCarta(pacote.pesos);
    player.colecao.push(carta.id);
    consumirDesconto(player);
    savePlayer(ctx.userId, player);

    const resultado = new EmbedBuilder()
      .setColor(RARIDADE_COR[carta.raridade])
      .setTitle(`${pacote.nome} aberto!`)
      .setDescription(`${carta.emoji} Você recebeu: **${carta.nome}** (${carta.raridade})\nATQ: ${carta.ataque}${carta.efeito !== 'nenhum' ? ` · Efeito: ${carta.efeito}` : ''}`)
      .setFooter({ text: `Saldo restante: ${player.moedas} moedas` });

    await i.update(montarPayload(categoria, player));
    await i.followUp({ embeds: [resultado] });
  });

  collector.on('end', async () => {
    try { await msg.edit({ components: [] }); } catch { /* mensagem pode já ter sido apagada */ }
  });
}

module.exports = lojaCore;
