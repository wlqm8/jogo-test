# Capim & Cia 2.1 — Uma fazenda com planos

Uma fazenda 2D em pixel art para Windows e navegador. Plante de dia, proteja seus canteiros à noite e construa uma rotina com sementes, água, ajudantes e uma coleção de foices.

## Jogar no Windows

Na seção **Releases** do repositório, baixe o ZIP da versão desejada, escolha **Extrair tudo**, entre na pasta `Capim-e-Cia` e abra `Capim-e-Cia.exe`. Mantenha os outros arquivos junto do executável. Funciona offline em Windows 10/11 de 64 bits e não exige Node.js instalado. `Criar-atalho.bat` cria um atalho opcional na área de trabalho.

A prévia de arquivos da conversa não executa o jogo. Baixe o pacote e abra fora da conversa. A edição de navegador `dist/jogar.html` também funciona como arquivo único no Chrome/Edge.

## Imagens da interface

[Primeiros passos](docs/images/primeiros-passos.png) · [Missões](docs/images/missoes.png) · [Construções](docs/images/construcoes.png) · [Culturas e pesquisa](docs/images/mercado.png) · [Bento e Gota](docs/images/ajudantes.png) · [Caixas e fusões](docs/images/caixas.png) · [Defesa noturna](docs/images/noite.png)

As imagens mostram cenários de teste; o jogo novo começa com os recursos iniciais descritos abaixo.

## Como começar

Você recebe **24 sementes de capim**, um balde com **12 águas** e uma **foice comum de grau 4**. Escolha Plantar, segure Espaço próximo ao campo e depois escolha Regar. As plantas só crescem depois de regadas. Ao amadurecer, use a foice para colher. O mato natural também pode ser cortado para conseguir ouro no começo.

O guia no campo acompanha plantar → regar → colher, com botões para selecionar a próxima ferramenta. Também mostra sementes esgotadas, balde vazio, custo de reparo e o tempo restante das culturas ao alcance. Clicar em uma ferramenta devolve o foco ao campo para continuar com Espaço. A enxada do inventário seleciona plantio; **4** ou o botão Reparar seleciona reparo.

| Ação                     | Controle                           |
| ------------------------ | ---------------------------------- |
| Mover                    | WASD ou setas                      |
| Foice: colher e defender | 1                                  |
| Enxada: plantar          | 2                                  |
| Balde: regar             | 3                                  |
| Enxada: reparar danos    | 4                                  |
| Usar a ação escolhida    | Segurar Espaço ou o mouse no campo |
| Reabastecer o balde      | R, perto do poço                   |
| Pausar / continuar       | P                                  |
| Tela cheia do aplicativo | F11                                |
| Menu do aplicativo       | Alt                                |
| Salvar / ajuda           | Ctrl+S / F1                        |

Os botões do inventário e a barra do campo permitem selecionar tudo com o mouse. Na edição móvel, há joystick e botão de ação por toque.

## O campo e a noite

O mapa tem **41 × 29 blocos**, quase três vezes a área anterior. A câmera acompanha o personagem; o mapa pequeno marca casa, poço, canteiros e lobos.

Cada ciclo tem **4 minutos de dia e 1 minuto de noite**, contando apenas tempo ativo de jogo. Menus, pausa e o aplicativo fechado suspendem o ciclo e o crescimento das culturas. Não há ataques nem perdas enquanto você está fora. O mato natural mantém seu crescimento separado em 30 segundos.

À noite, os lobos procuram plantações, atacam e deixam canteiros destruídos. Use a foice para espantá-los. A enxada repara a área pagando **ouro**; depois é necessário replantar. O custo inicial é 12 ouro e aumenta gradualmente com os dias e a fazenda. A habilidade Mestre de obras reduz esse custo. Lobos desaparecem ao amanhecer. Existe bônus de proteção quando uma noite começa com plantas e termina sem perdas.

## Sementes, produção e água

Cada plantio consome 1 semente. Compre pacotes de 10 ou 100 no Mercado com **ouro**. Culturas mais valiosas desbloqueiam com o nível do fazendeiro.

| Cultura | Nível | Tempo após regar | Ouro base | Preço de 10 sementes |
| ------- | ----: | ---------------: | --------: | -------------------: |
| Capim   |     1 |             30 s |         5 |                   10 |
| Trigo   |     2 |             35 s |        12 |                   40 |
| Alface  |     3 |             40 s |        18 |                   65 |
| Cenoura |     4 |             50 s |        28 |                  100 |
| Milho   |     6 |             65 s |        40 |                  155 |
| Batata  |     7 |             75 s |        50 |                  190 |
| Tomate  |     9 |             85 s |        70 |                  280 |
| Abóbora |    10 |            100 s |        90 |                  360 |

O balde comporta 24 águas inicialmente. Uma rega usa 1 água por canteiro, uma única vez por cultura. Aproxime-se do poço e pressione R para encher o balde gratuitamente. Habilidades aumentam a capacidade e a velocidade de rega. O robô usa seu próprio reservatório e busca água sozinho. Os tempos da tabela são os tempos base, antes da melhoria da composteira.

## Ouro, diamantes e colheitas especiais

**Ouro** paga sementes, reparos, construções, pesquisa e compra/evolução de parceiros. **Diamantes** compram caixas de foice.

A qualidade é sorteada ao plantar:

| Qualidade | Chance inicial | Ouro da cultura | Diamantes ao colher |
| --------- | -------------: | --------------: | ------------------: |
| Normal    |          94,9% |              ×1 |                   0 |
| Dourada   |             5% |              ×2 |                  10 |
| Lendária  |           0,1% |              ×5 |                 500 |

A pesquisa de Botânica tem 5 níveis, comprados com ouro por 250, 750, 2.000, 4.500 e 9.000. Cada nível soma **1 ponto percentual** à chance de dourada e **0,02 ponto percentual** à de lendária. No máximo, ficam em 10% e 0,2%. A pesquisa vale para os próximos plantios. Plantas destruídas por lobos não concedem recompensa.

## Caixas e fusões de foices

A loja oferece **1 caixa por 50 diamantes** ou **11 caixas por 500**. Não existe compra com dinheiro real. As chances por abertura são fixas e aparecem na loja:

| Raridade |  Chance |
| -------- | ------: |
| Comum    |   33,1% |
| Bom      |   43,5% |
| Raro     |   18,4% |
| Épico    | 4,7982% |
| Lendário |    0,2% |
| Mítico   | 0,0018% |

As chances somam 100%, representadas por pesos inteiros em um milhão de resultados para manter inclusive a chance mítica precisa. Cada caixa dá uma foice de **grau 4**. São **6 raridades × 4 graus = 24 variantes**, com arte, dano, intervalo e alcance próprios.

Combine **5 cópias da mesma raridade e grau** para obter **1 do próximo grau**: 4 → 3 → 2 → 1. Grau 1 é o máximo; não vira outra raridade. A fusão não custa moedas adicionais. A coleção permite equipar qualquer foice possuída. Uma foice sorteada ou fundida é equipada automaticamente se tiver maior relação entre dano e intervalo de uso.

## Bento e Gota

Primeiro é necessário comprar o parceiro; depois o botão passa a oferecer sua evolução. Ambos têm até 3 níveis e são mantidos no rebirth.

- **Bento, cachorro coletor:** custa 350 ouro; melhorias custam 900 e 2.000. Colhe plantas maduras, carrega a produção e leva até a casa. O ouro e os diamantes da carga só entram na carteira na entrega. A capacidade aumenta com o nível e com a árvore. À noite, também ajuda a espantar lobos próximos. Ele não planta.
- **Gota, robô de rega:** custa 1.500 ouro; melhorias custam 2.800 e 5.500. Rega automaticamente, usa reservatório próprio e volta ao poço quando fica sem água. As melhorias aumentam rapidez, capacidade e área. Ele não planta nem colhe.

## Experiência e habilidades

Plantar, regar, colher, reparar, espantar lobos e concluir pedidos concedem experiência. Cada novo nível dá **1 ponto**, que pode ser gasto em três ramos:

- **Campo:** corrida, rapidez de colheita, rapidez/capacidade de rega e bônus de produção.
- **Ajudantes:** velocidade/carga do Bento, eficiência do Gota e força do latido protetor.
- **Proteção:** reparos mais baratos, força contra lobos e alcance da iluminação noturna.

Cada habilidade informa seu limite, nível e pré-requisitos. Habilidades de parceiros só podem ser aprendidas depois da compra do parceiro correspondente. A experiência e os pontos investidos permanecem após o rebirth.

## Construções funcionais

Em **Construções**, gaste ouro em três estruturas, compradas um nível por vez, com até 3 níveis cada. Elas permanecem após o rebirth e recebem detalhes visuais no campo.

| Construção      | Nível para liberar | Custos dos níveis 1 / 2 / 3 | Efeito por nível                                       |
| --------------- | -----------------: | --------------------------: | ------------------------------------------------------ |
| Cisterna        |                  2 |           300 / 900 / 2.400 | +12 águas no balde e +6 no reservatório do robô        |
| Cerca reforçada |                  3 |         450 / 1.400 / 4.000 | +1,25 s para um lobo destruir uma planta               |
| Composteira     |                  4 |         600 / 1.800 / 5.000 | +10% na velocidade de crescimento de todas as culturas |

A cisterna aumenta a capacidade; o abastecimento continua sendo feito no poço. A cerca dá tempo para reagir: não impede a entrada dos lobos. Com três níveis, um ataque precisa de 5,75 s em vez de 2 s. A composteira soma até +30% de velocidade de crescimento, mantendo a necessidade de rega e as probabilidades das culturas especiais.

## Missões, desafios e rebirth

Existe um **pedido por dia do jogo**: colha a quantidade indicada de uma cultura para receber ouro e experiência. O bônus só pode ser coletado uma vez; ao amanhecer surge outro pedido.

O botão **Missões e desafios**, junto do pedido diário, abre **14 missões permanentes**, em quatro caminhos:

- **Cultivo:** plantar 10, regar 20, colher 30 e depois 500 culturas.
- **Descobertas:** cortar 100 tufos naturais, abrir 11 caixas, alcançar nível 10 e fazer o primeiro rebirth.
- **Fazenda:** comprar Bento, comprar Gota e construir 6 níveis de estruturas.
- **Proteção:** espantar 5 lobos, proteger 3 noites sem perdas e espantar 50 lobos.

Cada missão mostra progresso, pré-requisito e recompensa fixa em ouro, diamantes e XP. O botão só libera quando os requisitos estiverem completos. Cada recompensa pode ser resgatada uma vez; progresso e resgates permanecem após fechar o jogo e fazer rebirth. O trabalho do cachorro também conta. A noite protegida exige plantas ao anoitecer e nenhuma perda até amanhecer; passar uma noite com o campo vazio não conta. O indicador no pedido diário avisa quando há recompensas prontas.

A fazenda ainda tem 5 níveis de construção e bônus de produção. O rebirth exige **nível 10 do fazendeiro**, uma **foice épica ou superior de grau 1 equipada** e **20.000 × (rebirths + 1) ouro**. Reinicia o ouro, os canteiros, a carga do cachorro e equipa uma foice comum. Mantém diamantes, coleção, sementes, parceiros, construções, pesquisa, experiência e habilidades. Cada rebirth concede +25% permanente de produção.

## Modo de teste

Em Códigos, resgate **MONEY** para ouro e diamantes infinitos. As carteiras mostram ∞, mas os saldos reais continuam separados e o modo pode ser desligado na mesma janela. Ele permite comprar sementes de qualquer nível para testar, mas não concede experiência nem pontos de habilidade automaticamente. As chances das caixas permanecem iguais.

## Salvamento e atualização

O save continua na chave `capim-e-cia:v1`, agora com formato interno versão 4. Saves da versão 1.1 são migrados preservando ouro, construções, rebirth e estatísticas; a antiga foice é convertida para uma variante da nova coleção. O jogador recebe as sementes iniciais e começa o primeiro dia da atualização. Saves da versão 2.0 mantêm carteira, coleção, parceiros, campos e habilidades; as construções e missões novas são iniciadas. O capim de 2.0 preserva a proporção de crescimento ao adotar o tempo de 30 s. A aplicação guarda uma cópia do save anterior à migração. Saves inválidos são rejeitados antes de alterar o estado.

No aplicativo, o perfil fica em `%APPDATA%\Capim-e-Cia`, separado da pasta do jogo. Mover ou atualizar a pasta do executável preserva o progresso neste computador. A edição de navegador usa armazenamento separado por navegador/origem. Não há sincronização entre computadores.

## Desenvolver e validar

Requer Node.js 22.12 ou mais recente. Os jogadores não precisam instalar Node.

```sh
npm ci
npm run dev
npm run desktop
```

`dev` serve na porta 3000; pare antes de usar `preview` ou escolha outra porta com `-- --port 3001`.

```sh
npm test
npm run check
npm run test:desktop
npm run test:browser
npm run build
npm run build:windows
```

O build estático vai para `dist/`, incluindo o HTML portátil. O pacote Windows e seu SHA-256 ficam em `release/`. A automação de publicação no GitHub gera o mesmo pacote e o anexa à Release correspondente à versão do `package.json`.

`test:browser` usa Chromium headless para validar o HTML portátil no computador e em 390 × 844. Por padrão procura `/usr/bin/chromium`; `CAPIM_BROWSER_PATH` permite indicar outro executável compatível.

A versão é testada no Electron/Linux; o executável é gerado para Windows x64 e não foi executado em Windows neste ambiente. O pacote de testes não tem assinatura digital de editor.

## Desempenho e organização

A arte é desenhada em Canvas, sem bibliotecas de jogo, fontes ou imagens remotas. O cenário é pré-desenhado, o mato usa sprites em cache, apenas a região visível é renderizada e os agentes reutilizam caminhos. Há limite de lobos e o mapa é pequeno em memória.

- `src/model.js`: mapa, ouro, foices, rebirth e compatibilidade de saves.
- `src/farming.js`: culturas, ciclo, água, ajudantes, lobos, experiência e habilidades.
- `src/loot.js`: raridades, 24 foices e pesos exatos das caixas.
- `src/progression.js`: construções, missões e suas recompensas.
- `src/game.js`: renderização, câmera, controles e efeitos.
- `src/app.js`: menus, mercado, inventário e persistência.
- `desktop/`: janela, menu nativo e protocolo de arquivos offline.
- `tests/`: regras, migração real do save antigo e testes funcionais da janela.

## Ideias para próximas versões — ainda não implementadas

Estações com culturas próprias; clima que altera a necessidade de água; cozinha para transformar colheitas em receitas; decorações e melhorias visuais desbloqueadas por conquistas; visitas de comerciantes; e diferentes raças de cachorro ou modelos de robô. São objetivos que podem ampliar a variedade sem depender de compras reais ou obrigar o jogador a ficar conectado.
