// Helper compartilhado pra montar as opções de autocomplete (os dropdowns que
// aparecem enquanto o jogador digita um /comando), em vez de obrigar ele a
// saber e digitar o id exato de uma carta/armadura/perk/NPC.
//
// O Discord limita autocomplete a no máximo 25 opções por resposta e cada
// `name`/`value` a 100 caracteres — por isso sempre cortamos com .slice(0, 25)
// e usamos textos curtos.

// itens: lista de objetos já com { nome, ... }
// getLabel(item): texto mostrado pro jogador (ex: "🗡️ Espada Enferrujada")
// getValue(item): valor que volta pro bot quando o jogador escolhe (id ou nome)
function construirChoices(itens, focused, getLabel, getValue) {
  const alvo = (focused || '').trim().toLowerCase();
  const filtrados = alvo
    ? itens.filter(item => item.nome.toLowerCase().includes(alvo))
    : itens;

  return filtrados.slice(0, 25).map(item => ({
    name: getLabel(item).slice(0, 100),
    value: String(getValue(item)).slice(0, 100),
  }));
}

// Monta as opções de autocomplete de "carta que o jogador possui" — usado em
// /vender, /encantar e /dar, que resolvem a carta pelo NOME (não pelo id).
// player: objeto já carregado via getPlayer(userId, username).
function choicesCartasDoJogador(CARDS, player, focused) {
  const contagem = new Map();
  for (const id of player.colecao || []) {
    contagem.set(id, (contagem.get(id) || 0) + 1);
  }
  const possuidas = [...contagem.keys()].map(id => CARDS[id]).filter(Boolean);

  return construirChoices(
    possuidas,
    focused,
    c => `${c.emoji} ${c.nome} (x${contagem.get(c.id)})`,
    c => c.nome
  );
}

module.exports = { construirChoices, choicesCartasDoJogador };
