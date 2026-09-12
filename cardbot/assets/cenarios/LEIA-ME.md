# Imagens de fundo (cenários)

Coloque aqui os fundos de cada zona, com o nome exato do arquivo. Se o arquivo existir, o bot usa ele (cobrindo a tela toda, cortando as bordas se precisar, tipo "background-size: cover"). Se não existir, o bot cai automaticamente no cenário desenhado por código.

## Especificação da imagem
- Formato: **PNG ou JPG**
- Tamanho recomendado: **760x380** (ou qualquer proporção parecida, ~2:1) — o bot recorta pra caber, então quanto mais próximo dessa proporção, menos corte acontece
- Pode ser uma arte só de "ambiente" (sem personagens) — o jogador e o monstro são desenhados por cima automaticamente

## Lista das 5 zonas (ciclo de 15 andares, 3 andares por zona)

| Andares | Zona | Arquivo esperado |
|---|---|---|
| 1–3 | Caverna Sombria | `caverna_sombria.png` |
| 4–6 | Floresta Amaldiçoada | `floresta_amaldicoada.png` |
| 7–9 | Cripta Antiga | `cripta_antiga.png` |
| 10–12 | Fortaleza em Ruínas | `fortaleza_em_ruinas.png` |
| 13–15 | Covil do Rei Lich | `covil_do_rei_lich.png` |

Depois do andar 15, o ciclo repete (andar 16 = Caverna Sombria de novo, e assim por diante).

## Não tem nenhuma arte ainda?

Sem problema — o bot já tem um fundo desenhado por código pra cada zona (gradiente + elementos simples) até você adicionar as imagens aqui.
