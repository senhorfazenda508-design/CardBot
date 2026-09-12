# Ícones dos status (efeitos ruins/bons de batalha)

Mesma lógica de `assets/monstros`: se o arquivo existir, o bot desenha ele
como ícone circular embaixo da vida do jogador na tela de batalha. Se não
existir, cai automaticamente no emoji do catálogo (`game/status.js`).

## Especificação da imagem
- Formato: **PNG**, de preferência com fundo transparente
- Tamanho recomendado: **256x256** (quadrado) — o bot recorta em círculo sozinho

## Lista dos status e o arquivo esperado

| Status | O que faz | Arquivo |
|---|---|---|
| Envenenado | dano por turno | `veneno.png` |
| Queimando | dano por turno (mais forte, dura menos) | `queimadura.png` |
| Amedrontado | zera a chance de crítico daquele turno | `medo.png` |
| Nervoso | reduz o dano causado | `nervoso.png` |
| Paralisado | chance da carta falhar por completo | `paralisia.png` |
| Sonolento | chance da carta falhar por completo | `sonolencia.png` |
| Enfraquecido | reduz a cura recebida | `fraqueza.png` |
| Fatigado | reduz a defesa (toma mais dano) | `fadiga.png` |
| Sem Ar | bloqueia regeneração passiva e reduz escudo ganho | `sufoco.png` |
| Em Crise | corta metade do escudo atual na hora | `crise.png` |

## Extras (não são status do jogador — são estados que o próprio monstro entra)

| Estado | O que faz | Arquivo |
|---|---|---|
| Ritual de Adoração | monstros "Radiantes" se buffam (mais ataque + escudo) | `adoracao.png` (decorativo, ainda não desenhado na tela) |
| Fúria Desesperada | monstro quase morto ataca mais forte, mas se machuca a cada golpe | `furia_desesperada.png` (decorativo, ainda não desenhado na tela) |

Esses dois últimos já funcionam na lógica de `game/battle.js`, só não têm
ícone próprio desenhado na cena de batalha ainda (só aparecem no texto) —
dá pra adicionar depois do mesmo jeito que os outros, se quiser.
