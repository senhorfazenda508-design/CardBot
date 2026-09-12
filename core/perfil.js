const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer } = require('../db');
const { renderPerfil } = require('../game/gui');
const { bonusEquipamento } = require('../game/armor');
const { PERKS } = require('../game/perks');
const { calcularPontuacao } = require('../game/city');

async function perfilCore(ctx) {
  const player = getPlayer(ctx.userId, ctx.username);
  const buffer = await renderPerfil(ctx.username, ctx.avatarURL, player);
  const attachment = new AttachmentBuilder(buffer, { name: 'perfil.png' });

  const { armadura } = bonusEquipamento(player);
  const pontosCidade = calcularPontuacao(player.cidade);
  const perkPassiva = player.equipamento.perkPassiva ? PERKS[player.equipamento.perkPassiva] : null;
  const perkAtiva = player.equipamento.perkAtiva ? PERKS[player.equipamento.perkAtiva] : null;

  const linhasExtra = [
    armadura ? `🥋 Armadura: **${armadura.nome}**` : '🥋 Nenhuma armadura equipada',
    perkPassiva || perkAtiva
      ? `✨ Perks: ${[perkPassiva?.nome, perkAtiva?.nome].filter(Boolean).map(n => `**${n}**`).join(' + ')}`
      : '✨ Nenhuma perk equipada — use `/perks`',
    player.cidade.fundada ? `🏙️ Cidade: **${pontosCidade}** pontos` : '🏙️ Cidade ainda não fundada — use `/cidade`',
  ];

  const embed = new EmbedBuilder().setColor(0x5865f2).setImage('attachment://perfil.png').setDescription(linhasExtra.join('\n'));

  await ctx.send({ embeds: [embed], files: [attachment] });
}

module.exports = perfilCore;
