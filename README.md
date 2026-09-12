# 🎴 Bot Roguelite de Cartas

Bot de Discord com um roguelite de batalhas por cartas e economia de moedas.

## Comandos

Todo comando funciona das duas formas: como **slash command** (`/explorar`) ou como **comando com prefixo** (`;adv`). Escolha a que preferir — fazem exatamente a mesma coisa.

| Slash | Prefixo (e apelidos) | O que faz |
|---|---|---|
| `/perfil` | `;perfil`, `;p`, `;profile` | Card visual com avatar, moedas e estatísticas |
| `/explorar` | `;adv`, `;exp`, `;explorar`, `;batalha`, `;lutar` | Avança um andar na masmorra: mostra a tela "X apareceu!" e depois a cena de batalha com seu avatar vs. o monstro |
| `/recolher` | `;recolher`, `;sair`, `;bank` | Encerra a run atual com segurança e guarda as moedas ganhas nela |
| `/loja` | `;loja`, `;shop`, `;loj` | Compra pacotes de cartas (Comum/Raro/Épico/Lendário) com moedas |
| `/inventario` | `;inventario`, `;inv`, `;i`, `;mochila` | Imagem em grade de slots com suas cartas, empilhando repetidas com `x2`, `x3`... |
| `/saldo` | `;saldo`, `;money`, `;moedas` | Mostra quantas moedas você tem |
| `/diario` | `;diario`, `;daily` | Recompensa diária de moedas (com bônus por sequência de dias) |
| `/carta <nome>` | `;carta <nome>` | Mostra os detalhes visuais de uma carta específica |
| `/vender <nome> [qtd]` | `;vender <nome> [qtd]` | Vende cópias de uma carta por moedas |
| `/dar <pessoa> <moedas ou carta>` | `;dar @pessoa 100` ou `;dar @pessoa Excalibur` | Presenteia outro jogador com moedas ou uma carta |
| `/duelo <pessoa>` | `;duelo @pessoa` | Desafia outro jogador para uma batalha PvP por turnos |
| `/top` | `;top`, `;ranking`, `;rank` | Ranking global — alterna entre Moedas 💰 e Cidades 🏙️ com botões |
| `/armadura` | `;armadura`, `;equipar` | Vê e equipa suas armaduras (defesa % + vida extra) |
| `/perks` | `;perks`, `;perk`, `;habilidades` | Vê e equipa suas perks: 1 passiva (sempre ativa) + 1 ativa (usável 1x por batalha/duelo) |
| `/cassino` | `;cassino`, `;casino`, `;apostar` | Cassino Medieval: dados (Hazard), Roda da Fortuna e Cara-ou-Coroa do Rei |
| `/encantar <nome>` | `;encantar <nome>` | Consome cópias de uma carta + moedas para deixá-la mais forte (+1 a +10) |
| `/cidade` | `;cidade`, `;vila`, `;cid` | Funda e constrói sua cidade num mapa 5x5, com ranking de "maior cidade" |
| `/ajuda` | `;ajuda`, `;help`, `;comandos` | Lista todos os comandos dentro do próprio Discord |
| `/taverneiro <mensagem>` | `;taverneiro`, `;npc`, `;falar`, `;thomas` | Conversa com Thomas, o taverneiro da vila — um NPC com IA (Groq) |
| `/convidar [npc]` | `;convidar`, `;recrutar` | Vê a lista de moradores convidáveis ou convida um deles (pagando moedas) pra viver na sua vila |
| `/morador <npc> <mensagem>` | `;morador`, `;vizinho` | Conversa com um morador já convidado — cada um tem personalidade e memória próprias (IA, Groq) |
| `/taverna` | `;taverna`, `;cena` | Gera uma cena de diálogo entre os moradores da sua vila (e o Thomas) conversando entre si na taverna |
| `/roubar <alvo>` | `;roubar`, `;assaltar` | Tenta roubar moedas soltas de outro jogador (o que está no `/banco` dele é protegido) |
| `/admin` | `;admin` | Painel de administração (só admins) — veja a seção **Painel de Admin** abaixo |

### ⚠️ Importante para os comandos com prefixo (`;`)

Pra `;adv`, `;perfil` etc. funcionarem, o bot precisa ler o **conteúdo das mensagens**, que é uma permissão especial do Discord ("Privileged Intent"). Ative assim:

1. Vá em https://discord.com/developers/applications → sua aplicação → **"Bot"**
2. Role até **"Privileged Gateway Intents"**
3. Ative o toggle **"MESSAGE CONTENT INTENT"**
4. Salve

Sem isso, os comandos `/slash` funcionam normalmente, mas os de prefixo `;` não vão responder.

## Como funciona o roguelite

- Cada `/explorar` te leva a um andar mais difícil, contra um monstro mais forte.
- Em batalha, você recebe 3 cartas aleatórias da sua coleção por turno e escolhe uma para jogar.
- Cartas têm efeitos: dano puro, cura, roubo de vida, crítico ou escudo.
- Se vencer, ganha moedas e pode continuar ou usar `/recolher` para guardar tudo com segurança.
- Se morrer, perde as moedas **não recolhidas** daquela run (mas mantém sua coleção de cartas e moedas já guardadas).

## Telas visuais

`/explorar`, `/inventario` e `/cidade` (e seus equivalentes com `;`) geram imagens na hora usando `@napi-rs/canvas`:

- **Encontro:** tela estilo RPG clássico ("Um X apareceu!") com a barra de vida do monstro
- **Batalha:** seu avatar do Discord vs. o monstro, com barras de vida dos dois lados e uma caixa de texto embaixo mostrando o que aconteceu no turno
- **Inventário:** grade de slots (estilo inventário de jogo) com borda colorida por raridade e contador `x2`, `x3`..., **além de um texto logo abaixo com o nome de cada carta** (e o nível de encantamento, se houver), separado por raridade
- **Perfil:** card com seu avatar, moedas, estatísticas, barrinha de raridades, e agora também a armadura equipada e a pontuação da sua cidade
- **Cidade:** mapa 5x5 com os edifícios já construídos, cada um com seu ícone e cor

## Armadura e Encantamento

- **`/armadura`**: mostra suas armaduras (compradas na `/loja`, categoria Armaduras) e deixa equipar uma pelo menu. Armadura equipada reduz uma % do dano recebido e aumenta sua vida máxima, tanto em `/explorar` quanto em `/duelo`.
- **`/encantar <carta>`**: consome cópias da própria carta + moedas para subir o nível de encantamento dela (+1 até +10). Toda cópia daquele tipo de carta que você jogar em batalha sai mais forte. O custo em cópias/moedas cresce a cada nível.

## Loja por categorias

`/loja` agora tem um menu de categorias:
- **🃏 Pacotes de Cartas**: os pacotes de sempre (Comum → Ancestral), cada um com sua tabela de chances por raridade
- **🥋 Armaduras**: compra direta (sem sorteio) de cada armadura do jogo
- **✨ Perks**: compra direta (sem sorteio) de cada perk passiva/ativa do jogo

## Cartas com Efeitos Únicos

Além dos efeitos clássicos (dano puro, crítico, cura, roubo de vida, escudo), o catálogo agora tem **42 cartas novas** (6 por raridade) usando **10 efeitos inéditos**, implementados direto no motor de batalha (`game/battle.js`):

| Efeito | O que faz |
|---|---|
| ⚔️ **Execução** | Dano bem maior se o alvo já estiver abaixo de um certo % de vida — a carta de "acabar com quem tá quase morto" |
| 🌾 **Ceifador** | Quanto mais perto da morte o alvo estiver, mais dano bônus (crescente, não é tudo-ou-nada como a Execução) |
| 🪓 **Vingança** | Quanto mais machucado VOCÊ estiver, mais forte o golpe sai — prêmio por jogar arriscado |
| 💀 **Sacrifício** | Consome parte da sua própria vida atual pra causar um dano bem maior |
| 🗡️ **Último Suspiro** | Se sua vida estiver muito baixa, o golpe sai multiplicado — a carta da virada dramática |
| 🍵 **Cura Percentual** | Cura baseada numa % do seu HP MÁXIMO (escala com o personagem, não é um valor fixo) |
| 🩸 **Roubo Blindado** | Como o roubo de vida normal, mas metade do valor vira escudo em vez de cura |
| 🔨 **Brecha** | Ignora completamente o escudo do alvo nesse golpe |
| 🔱 **Investida Dupla** | Acerta duas vezes na mesma jogada, cada golpe podendo ser esquivado/bloqueado separadamente |
| 🎲 **Sorte** | Sorteia um bônus diferente a cada jogada: crítico automático, cura ou escudo |

Todas essas cartas entram normalmente nos pacotes da `/loja`, no `/encantar` (o valor de limiares/custos como Execução, Último Suspiro e Sacrifício fica travado — só o ataque sobe — pra não desbalancear) e em qualquer lugar que já usa o baralho do jogador.

## Colonização de Cidade

- **`/cidade`**: primeiro você funda a cidade construindo o **Castelo** no centro do mapa. Depois disso, pode construir Casa, Fazenda, Serraria, Mina de Pedra, Mina de Ouro, Mercado, Muralha, Torre e Jardim em qualquer lote vazio.
- Edifícios de produção geram recursos (madeira, pedra, comida, ouro) com o tempo — use o botão **"Coletar recursos"** para receber o que foi produzido (acúmulo tem um teto de 12h, então não precisa ficar de olho o tempo todo).
- Cada edifício também dá pontos de cidade. O botão **"Ranking de cidades"** (e a aba Cidades do `/top`) mostra quem tem a maior cidade do bot — esse é o objetivo do sistema: crescer até ser a maior.

## Perks (passivas e ativas)

- **`/perks`**: mostra suas perks compradas e deixa equipar **1 passiva** + **1 ativa** por menus separados.
- **Passivas** ficam ligadas o tempo todo, em batalha e em duelo, sem precisar fazer nada:
  - ❤️ Constituição Robusta — +15 de vida máxima
  - 💪 Força Bruta — +10% de dano em todas as cartas
  - 🪨 Pele de Pedra — reduz 8% do dano recebido (soma com a armadura)
  - 🌿 Regeneração Natural — cura 3 de vida no início de cada turno seu
  - 🩸 Vampirismo — recupera 12% do dano causado como vida
  - 🎯 Instinto Crítico — +10% de crítico em cartas com crítico, +5% de crítico em qualquer carta
  - ✨ Último Fôlego — sobrevive a um golpe fatal com 1 de vida (1x por batalha/duelo)
- **Ativas** aparecem como um botão extra ("Usar [nome]") ao lado das cartas em batalha/duelo. Usar **não gasta o turno**, mas só pode ser usada 1 vez por luta:
  - 💚 Explosão Curativa — recupera 25% da vida máxima na hora
  - 😡 Fúria de Batalha — a próxima carta jogada causa o dobro de dano
  - 🧱 Muralha Instantânea — ganha 20 de escudo na hora
  - 🏹 Golpe Certeiro — a próxima carta jogada é garantidamente crítica
  - 🌀 Roubo de Energia — rouba 15 de vida do inimigo/oponente na hora
- Perks são compradas na `/loja` (categoria Perks), com moedas, e ficam guardadas até você equipar em `/perks`.

## Mais tipos de carta: cura e defesa

Todas as raridades (Comum → Ancestral) agora têm pelo menos uma carta de **cura** (recupera vida na hora) e uma de **defesa/escudo** (bloqueia dano dos próximos golpes), além das cartas ofensivas de sempre. Quanto maior a raridade, maior o valor de cura ou escudo.

## Cassino Medieval

`/cassino` (ou `;cassino`) abre a taverna de apostas do reino, com 3 jogos:

- **🎲 Jogo de Hazard** (`/cassino dados aposta:100`) — role 2 dados: dobradinha paga 2x, soma alta (9–12) paga 1.5x, soma 7–8 devolve a aposta (empate), o resto perde.
- **🎡 Roda da Fortuna** (`/cassino roleta aposta:100`) — gire a roda de madeira: os gomos vão de "💀 Ruína" (perde tudo) até "🐉 Tesouro do Dragão" (10x).
- **🪙 Cara ou Coroa do Rei** (`/cassino moeda aposta:100 escolha:cara`) — escolha um lado e acerte pra ganhar 1.9x.

Aposta mínima de 10 moedas, máxima de 5.000. Todos os jogos têm uma pequena vantagem da casa (3–6%), então é pra ser diversão, não uma fonte confiável de moedas. Chamando `;cassino` sem argumentos mostra o cardápio completo com as regras.

## Duelo, venda e presentes

- **`/duelo @pessoa`**: manda um desafio com botões Aceitar/Recusar. Se aceito, os dois batalham por turnos (40 de vida cada, mais o bônus de vida de armadura equipada), cada um usando cartas (já encantadas, se houver) da própria coleção. Quem vencer ganha 40 moedas, quem perder ganha 10 por participar.
- **`/vender <carta> [quantidade]`**: troca cópias de uma carta por moedas. Preço varia por raridade (Comum 15, Raro 45, Épico 120, Lendário 300).
- **`/dar @pessoa <valor>`**: se `<valor>` for um número, manda moedas; se for um nome de carta, manda a carta (desde que você tenha).

## Taverneiro (NPC com IA)

`/taverneiro <mensagem>` (ou `;taverneiro`, `;npc`, `;falar`) abre uma conversa com **Thomas**, o taverneiro da vila. Ele é movido pela **Groq API** (modelo padrão `openai/gpt-oss-120b`, grátis) e tem personalidade própria: conversa como uma pessoa normal do Discord, com gírias e humor, e reage ao que você diz.

Dependendo da conversa — se você for simpático, engraçado, contar uma boa história ou convencê-lo de verdade — ele **pode**:
- Dar uma gorjeta em moedas na hora
- Liberar um desconto temporário (até 25%) pra próxima compra na `/loja`

Ele também pode simplesmente não dar nada, ou ficar desconfiado se perceber que você só está pedindo moedas sem esforço, repetindo o pedido, ou tentando manipulá-lo com instruções escondidas — isso é intencional, faz parte do personagem.

**Isso afeta a economia de verdade** (moedas somam no seu saldo, descontos aplicam na loja), então o bot tem limites fixos no código (não dependem da IA "se comportar"):
- Cooldown de 8s entre mensagens
- Máximo de 40 moedas de gorjeta por mensagem, e 150 por jogador por dia
- Desconto máximo de 25%, válido por 10 min ou até a próxima compra (o que vier primeiro)

Pra funcionar, defina `GROQ_API_KEY` no `.env` (chave grátis em https://console.groq.com). Sem a chave configurada, o comando responde educadamente que "Thomas está dormindo" em vez de quebrar o bot.

**A memória do Thomas é persistente**: fica salva no seu save (`data/players.json`), então ele lembra do seu histórico de conversa mesmo depois do bot reiniciar. O `/ia` (Narrador) funciona do mesmo jeito — antes a memória dele só existia em RAM e sumia a cada reinício do bot; agora também é salva.

## Moradores da vila (convidar, conversar, e a Taverna Viva)

Além do Thomas, a vila pode ganhar outros moradores com IA e personalidade própria — cada um com sua própria memória de conversa com você, guardada no seu save:

- 🔨 **Helena, a Ferreira** — direta, prática, dá conselhos táticos
- 📚 **Isadora, a Erudita** — curiosa, formal, cheia de teorias sobre o mundo do jogo
- 🧒 **Pipoca, a Criança da Vila** — animada, inocente, acha você um herói
- 🦉 **Velho Corvo, o Eremita** — fala em enigmas sobre destino e sorte
- 👻 **Vulto, o Prisioneiro Etéreo** — melancólico, grato por companhia

**Como funciona:**
1. Funde sua cidade primeiro (`/cidade`).
2. `/convidar` (sem argumento) mostra a lista de moradores disponíveis e o custo em moedas de cada um. `/convidar npc:helena` (ou `;convidar helena`) convida.
3. `/morador npc:helena mensagem:...` (ou `;morador helena <mensagem>`) conversa com quem já foi convidado. Assim como o Thomas, cada morador pode te dar uma pequena gorjeta em moedas ou um desconto na `/loja` se gostar da conversa — com os mesmos limites fixos no código (cooldown, teto diário de moedas, teto de desconto) pra IA nunca "quebrar" a economia. A `/loja` sempre aplica o **melhor** desconto ativo entre o Thomas e todos os moradores convidados.
4. `/taverna` (ou `;taverna`, `;cena`) gera, na hora, uma cena de diálogo **entre os próprios NPCs** — o Thomas e até 2 moradores convidados, escolhidos aleatoriamente, batendo papo entre si na taverna (fofoca leve, causos, comentários sobre você). Usa a mesma `GROQ_API_KEY` do Thomas, sem precisar de configuração extra. Tem um cooldown de 3 min pra não abusar da API.

> Nota de design: Thomas (`/taverneiro`) e Aldric, o Mago (`/mago`) **não** entram na lista de convidáveis — o Thomas já é global e sempre disponível, e o Aldric já tem seu próprio sistema (sem IA) ligado aos Fragmentos Arcanos. Manter os dois de fora evita dois "cérebros" diferentes controlando o mesmo personagem.

## Roubo

`/roubar alvo:@pessoa` (ou `;roubar @pessoa`, `;assaltar`) tenta roubar moedas da **carteira** de outro jogador — o que a vítima já guardou no `/banco` está sempre protegido, então roubar só compensa contra quem "está bobeando" com moeda solta.

- Só funciona se a vítima tiver pelo menos 30 moedas soltas.
- Chance de sucesso ~45%, reduzida pela armadura equipada da vítima (armadura de defesa alta protege contra roubo, além de proteger em batalha).
- Sucesso: leva 20-35% da carteira da vítima (até 250 moedas), e ela fica protegida contra novos roubos por 30 min.
- Falha: você paga uma multa da guarda.
- Cooldown de 15 min por jogador entre tentativas (sucesso ou falha).

## Painel de Admin

`/admin` (ou `;admin`) é um painel único com todos os poderes de administração, organizado em grupos:

| Grupo | Subcomandos | Pra que serve |
|---|---|---|
| `jogador` | `moedas`, `banco`, `carta`, `removercarta`, `armadura`, `perk`, `fragmentos`, `perfil`, `resetar` | Dar/remover moedas, banco, cartas, armaduras, perks e Fragmentos Arcanos de qualquer jogador; ver um resumo técnico completo (`perfil`); ou resetar o save dele do zero |
| `cidade` | `recursos`, `resetar` | Ajustar madeira/pedra/comida/ouro da cidade de alguém, ou resetar a cidade inteira |
| `npc` | `convidar`, `resetarmemoria` | Forçar um morador a entrar na vila de alguém de graça (sem custo), ou apagar a memória de conversa de um jogador com um NPC específico (ou `todos`/`narrador`/`taverneiro`) |
| `roubo` | `limpar` | Zera o cooldown e a proteção de roubo de um jogador (útil em testes) |
| `sistema` | `anuncio`, `stats` | Manda um anúncio formatado, ou vê estatísticas gerais do bot (jogadores, moedas em circulação, cartas distribuídas, cidades fundadas) |

**Exemplos:**
```
/admin jogador moedas usuario:@Fulano quantidade:500
;admin jogador carta @Fulano lâmina sombria 2
;admin jogador resetar @Fulano sim
/admin cidade recursos usuario:@Fulano recurso:madeira quantidade:300
;admin npc convidar @Fulano helena
;admin sistema stats
```

Ações destrutivas (`resetar`) pedem confirmação explícita (`confirmar:true` no slash, ou escrever `sim`/`confirmar` no final do comando com prefixo) antes de executar.

**Quem pode usar:**
- Qualquer pessoa com a permissão **Gerenciar Servidor** no Discord (a mesma exigida por `/personalidade`). O comando `/admin` já fica escondido no Discord pra quem não tem essa permissão.
- Donos do bot, opcionalmente, via `OWNER_IDS` no `.env` — uma lista de IDs de usuário do Discord separados por vírgula (ex: `OWNER_IDS=123456789012345678,987654321098765432`). Isso libera o `/admin` (e o `;admin`) pra essas pessoas em **qualquer** servidor onde o bot estiver, e também em DM — útil pra manutenção sem precisar ser admin de cada servidor.

Toda ação de admin também é checada de novo dentro do próprio código (não só pela configuração de permissão do Discord), então mesmo que a permissão do canal/servidor esteja mal configurada, ninguém sem acesso consegue executar nada.

## 🖥️ Painel Web (site de administração)

Além do `/admin` pelo Discord, o projeto tem um **site próprio** (`web/`) pra configurar o bot sem precisar digitar comando nenhum:

- **Quem é o dono do bot** e **quem mais é admin** (por ID do Discord — funciona em qualquer servidor e em DM, é a mesma lista que o `/admin` já respeitava, só que editável pelo navegador).
- **Contas de acesso ao próprio painel** (separado dos IDs do Discord acima): quem pode logar no site. Papel **Dono** pode tudo, inclusive criar/remover outras contas; papel **Admin** edita NPCs e vila mas não mexe em contas nem no dono do bot.
- **Moradores da vila (NPCs)**: nome, emoji, profissão, "jeito de ser" (persona/comportamento) e bordões de cada um — dá pra criar novos, editar e remover. As mudanças valem **na hora**, sem reiniciar o bot (inclusive já aparecem no autocomplete de `/convidar`, `/morador` e `/admin npc`).
- **Vila & edifícios**: o catálogo de edifícios que todo jogador pode construir na cidade (custo, produção por hora, pontos, cor). Vale a partir do próximo restart do bot.
- **Cartas, Armaduras e Perks**: os catálogos completos do jogo — nome, emoji, raridade, ataque/efeito das cartas, defesa/vida das armaduras, e os bônus das perks (com um campo de "bônus avançado" em JSON pra cobrir os campos variados de cada perk, tipo `vidaBonus`, `danoMult`, `efeito`, etc.). Também valem a partir do próximo restart do bot.
- **Monitoramento**: se o bot está online (com ping e nº de servidores), total de jogadores, moedas em circulação, cidades fundadas e o ranking de top jogadores. Os dados de jogador aparecem só pra leitura — edição continua sendo feita pelo `/admin` do Discord, pra não haver risco de o painel e o bot se sobrescreverem (o bot guarda os dados de jogador em cache na memória; NPCs/config são lidos direto do disco a cada uso, por isso esses sim atualizam na hora).

> **Sobre emojis:** todo campo de emoji do painel (NPCs, edifícios, cartas, armaduras, perks) é validado antes de salvar — se vier vazio ou não for um emoji de verdade, o site troca automaticamente por um emoji padrão. Isso existe porque o Discord rejeita a interação inteira se um botão/menu receber um emoji inválido.

### Como rodar o painel

O painel roda como um **processo separado** do bot (os dois podem ficar ligados ao mesmo tempo, sem problema):

```bash
npm run painel
```

Acesse `http://localhost:3000` (ou a porta que você definir em `PANEL_PORT` no `.env`). No primeiro acesso, o site vai pedir pra você criar a conta de **Dono** do painel — é só escolher usuário e senha ali mesmo, na tela.

Pra deixar acessível de fora da sua máquina (ex: hospedar num VPS), configure `PANEL_SESSION_SECRET` no `.env` com um valor aleatório e coloque o painel atrás de um proxy com HTTPS (ex: Nginx/Caddy) — o login usa cookie de sessão, então HTTPS é importante se for expor na internet.

## Instalação

1. **Crie a aplicação do bot:**
   - Acesse https://discord.com/developers/applications → "New Application"
   - Vá em "Bot" → "Reset Token" → copie o token
   - Em "OAuth2 → URL Generator", marque `bot` e `applications.commands`, dê permissão de enviar mensagens/usar comandos, e use o link gerado para convidar o bot pro seu servidor
   - Copie também o "Application ID" (é o CLIENT_ID)

2. **Configure o projeto:**
   ```bash
   cp .env.example .env
   ```
   Edite `.env` e preencha `DISCORD_TOKEN` e `CLIENT_ID`. Se quiser testar rapidamente em um único servidor, preencha também `GUILD_ID` (o ID do seu servidor, com o modo desenvolvedor do Discord ativado, clique com botão direito no servidor → "Copiar ID").

   Opcionalmente, preencha `OWNER_IDS` com seu ID de usuário do Discord (separe por vírgula se forem vários) pra ter acesso ao `/admin` em qualquer servidor e em DM — veja a seção **Painel de Admin** acima.

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Registre os comandos:**
   ```bash
   npm run deploy
   ```

5. **Rode o bot:**
   ```bash
   npm start
   ```

Pronto — o bot deve aparecer online e os comandos `/` devem funcionar no seu servidor.

6. **(Opcional) Rode o painel web:**
   ```bash
   npm run painel
   ```
   Acesse `http://localhost:3000` e crie sua conta de Dono do painel no primeiro acesso. Veja a seção **Painel Web** acima.

## Observações

- Os dados dos jogadores são salvos em `data/players.json`. É um armazenamento simples baseado em arquivo — ótimo para uso pessoal/servidor pequeno. Se quiser algo mais robusto no futuro (SQLite, Postgres), é só trocar o conteúdo de `db.js`.
- Fique à vontade para editar `game/cards.js` e adicionar novas cartas, mudar raridades ou ajustar valores de ataque/efeitos.
- Armaduras ficam em `game/armor.js`, perks em `game/perks.js`, o encantamento em `game/enchant.js` e os edifícios da cidade em `game/city.js` — são catálogos simples de objetos, fáceis de expandir com novos itens/edifícios/perks.
- Jogadores criados antes dessa atualização são migrados automaticamente na primeira vez que forem carregados (ganham os campos novos com valores padrão, sem perder nada do que já tinham).
