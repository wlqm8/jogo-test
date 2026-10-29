# Capim & Cia

Um jogo 2D de jardinagem em pixel art, com exploração em grade inspirada em Bomberman. Sem inimigos, limite de tempo ou vidas: explore um jardim finito, corte a grama madura, colete moedas e evolua sua foice.

## Jogar no computador

**Windows 10/11 de 64 bits:** baixe `Capim-e-Cia-Windows-x64.zip`, use **Extrair tudo** e abra **`Capim-e-Cia.exe`** dentro da pasta extraída. Mantenha os demais arquivos junto do executável. O jogo abre em uma janela própria e funciona offline, sem instalar Node.js ou navegador. O pacote é portátil, sem instalador.

O arquivo opcional `Criar-atalho.bat` cria um atalho na área de trabalho. O progresso fica em `%APPDATA%\Capim-e-Cia`, separado da pasta do jogo, e permanece ao fechar e reabrir. O progresso do navegador é separado do aplicativo. Esta versão de testes não possui assinatura digital de editor.

**Navegador:** `dist/jogar.html` continua disponível como edição de arquivo único. Extraia o ZIP antes e abra o HTML no Chrome ou Edge. A prévia desta conversa não executa o jogo; baixe o arquivo e abra fora da conversa.

**Para desenvolver:**

Requer Node.js **22.12 ou mais recente**. Instale as ferramentas de desenvolvimento com `npm ci`. O runtime do Electron será baixado na primeira abertura do aplicativo de desenvolvimento; os jogadores recebem tudo incluído no ZIP.

```sh
cd /workspace/jogo-test
npm ci
npm run dev
```

Abra o servidor na porta **3000** no navegador. Para usar outra porta: `npm run dev -- --port 3001` ou configure `PORT`.

Para abrir a janela de computador durante o desenvolvimento:

```sh
npm run desktop
```

Para gerar o pacote Windows x64, inclusive a partir de Linux:

```sh
npm run build:windows
```

O resultado fica em `release/Capim-e-Cia-Windows-x64.zip`, junto de um arquivo SHA-256. O build usa o runtime oficial do Electron, preserva a verificação de checksums, inclui os recursos em `app.asar` e não inclui dependências de desenvolvimento no jogo distribuído.

| Ação                                | Controle                                             |
| ----------------------------------- | ---------------------------------------------------- |
| Mover o personagem                  | WASD ou setas                                        |
| Cortar a grama                      | Segure Espaço ou o botão esquerdo do mouse no jardim |
| Cortar enquanto anda                | Ative “Corte automático”                             |
| Pausar / continuar                  | P ou botão de pausa                                  |
| Melhorar a foice                    | Painel lateral ou Oficina                            |
| Melhorar a fazenda / fazer rebirth  | Aba Fazenda ou cartão de progresso                   |
| Resgatar códigos                    | Botão de presente no cabeçalho                       |
| Ligar / desligar os efeitos sonoros | Ícone de som no jardim                               |
| Expandir o jardim                   | Ícone de expansão                                    |
| Tela cheia no aplicativo Windows    | F11                                                  |
| Mostrar o menu do aplicativo        | Alt                                                  |
| Salvar / ajuda no aplicativo        | Ctrl+S / F1                                          |

No aplicativo de computador, o jardim, os controles e as estatísticas cabem na janela; a câmera acompanha o personagem sem distorcer a arte. Na edição de navegador para celular, há joystick virtual, botão de corte multitoque e câmera próxima do personagem.

## Jardim e moedas

- Jardim de **25 × 17 blocos**, com cercas, arbustos, pedras, cabana e lago. Obstáculos bloqueiam o movimento e a linha de corte.
- A grama cresce em estágios visuais e fica totalmente madura **30 segundos** depois de ser cortada. Cortar grama imatura não dá moedas nem reinicia o crescimento.
- Cada novo tufo tem **72%** de chance de ser comum (**1 moeda**), **22%** de ser florido (**4 moedas**) e **6%** de ser dourado (**12 moedas**). No primeiro jardim, a distribuição é fixa; novas variantes são sorteadas em cada colheita.
- As moedas são coletadas automaticamente ao cortar, com animação no cenário.
- A pausa suspende o movimento e o corte. O jardim continua crescendo, inclusive enquanto a página está fechada.

## As 10 foices

As melhorias são sequenciais. O preço é o valor pago naquela melhoria; o saldo não pode ficar negativo. O alcance é uma área ao redor do personagem. Obstáculos e limites do mapa podem reduzir o número de gramas atingidas.

| Nível | Foice     | Preço da melhoria | Intervalo por corte | Área máxima |
| ----- | --------- | ----------------: | ------------------: | ----------: |
| 1     | Madeira   |           Inicial |              1,10 s |    5 blocos |
| 2     | Cobre     |                60 |              0,94 s |    9 blocos |
| 3     | Ferro     |               160 |              0,80 s |   13 blocos |
| 4     | Aço       |               360 |              0,67 s |   21 blocos |
| 5     | Prata     |               750 |              0,55 s |   25 blocos |
| 6     | Ouro      |             1.400 |              0,44 s |   29 blocos |
| 7     | Esmeralda |             2.500 |              0,35 s |   37 blocos |
| 8     | Safira    |             4.200 |              0,27 s |   49 blocos |
| 9     | Ametista  |             7.000 |              0,20 s |   61 blocos |
| 10    | Lendária  |            11.000 |              0,14 s |   81 blocos |

## Salvamento

Moedas, foice, fazenda, rebirths, modo de teste, contadores, posição e estado das gramas são salvos automaticamente no `localStorage`, na chave `capim-e-cia:v1`. Os dados ficam neste navegador e nesta origem; não há conta, servidor de partidas ou sincronização entre dispositivos. Se o navegador bloquear o armazenamento, a interface informa que a sessão está sem salvamento. Saves inválidos são rejeitados antes de alterar o estado do jogo. Saves anteriores às melhorias de fazenda, códigos e rebirth continuam compatíveis.

## Códigos para testes

Abra **Códigos** pelo ícone de presente no cabeçalho e resgate **`MONEY`**. O código aceita letras maiúsculas ou minúsculas.

- Ativa **dinheiro infinito**, identificado por **∞** e pela etiqueta **TESTE**.
- Permite comprar todas as melhorias de foice e fazenda sem gastar o saldo real. As compras continuam sequenciais.
- Não transforma o saldo salvo em `Infinity`: o jogo mantém uma opção de modo de teste separada do valor das moedas.
- Pode ser desativado pelo botão **Desativar** na mesma janela. As melhorias compradas permanecem.
- O modo é salvo no navegador e continua ativo após um rebirth, até ser desligado.
- Códigos desconhecidos exibem um aviso e não mudam a partida.

## Melhorias da fazenda

As melhorias são permanentes e alteram a cabana, os canteiros, as árvores e os enfeites. O tamanho do jardim permanece finito, e o crescimento continua em 30 segundos.

| Nível | Fazenda             |   Preço | Bônus de moedas | Chance de florida | Chance de dourada |
| ----- | ------------------- | ------: | --------------: | ----------------: | ----------------: |
| 1     | Jardim do sossego   | Inicial |              0% |               22% |                6% |
| 2     | Recanto florido     |     200 |            +10% |               24% |              7,5% |
| 3     | Quintal frutífero   |     700 |            +20% |               26% |                9% |
| 4     | Fazenda florescente |   2.000 |            +35% |               28% |             10,5% |
| 5     | Paraíso verde       |   5.500 |            +50% |               30% |               12% |

O bônus de moedas vale imediatamente; as novas chances de variantes valem para os próximos tufos sorteados. Frações dos bônus se acumulam até completar uma moeda inteira, evitando perder a produção de tufos de valor baixo.

## Rebirth

Chegar à **Foice Lendária, nível 10**, desbloqueia o rebirth na aba **Fazenda**. A confirmação mostra o que será reiniciado antes da ação.

- Reinicia o saldo de moedas, o nível da foice e a posição do personagem.
- Mantém o nível da fazenda, os contadores históricos e os rebirths anteriores.
- Concede **+25% permanente de moedas por rebirth**: +25% no primeiro, +50% no segundo, e assim por diante.
- Para fazer outro rebirth, é necessário chegar novamente à Foice Lendária.
- Os bônus de fazenda e rebirth se multiplicam: `produção = valor base × (1 + bônus da fazenda) × (1 + rebirths × 0,25)`.

## Validar e gerar a versão estática

```sh
npm test
npm run check
npm run build
npm run preview
npm run test:desktop
```

O build gera `dist/`, que pode ser servido por qualquer hospedagem de arquivos estáticos na raiz do domínio, e a edição portátil `dist/jogar.html`. `preview` serve essa pasta na porta 3000. Pare o servidor de desenvolvimento primeiro ou escolha outra porta.

Os **24 testes** de `npm test` verificam as regras do jogo, saves e o protocolo offline do aplicativo. `npm run test:desktop` abre o Electron com um perfil temporário, exercita teclado, moedas, MONEY, as 10 foices, fazenda e rebirth, confere o layout em resoluções de computador e fecha/reabre o aplicativo para validar a persistência. No Linux, esse teste usa o backend gráfico headless e desativa o sandbox apenas no processo de teste; o aplicativo distribuído mantém o sandbox ativo.

## Organização

```text
index.html           Interface e diálogos em português
src/model.js         Regras, mapa, economia, movimento e salvamento
src/game.js          Pixel art em Canvas, câmera, partículas e controles
src/app.js           Interface, oficina, áudio e persistência
src/style.css        Layout responsivo e controles de toque
tests/model.test.mjs  Testes das regras de jogo
scripts/serve.mjs     Servidor de desenvolvimento e preview
scripts/build.mjs     Geração do build estático
desktop/             Janela, menu, ícones e protocolo offline do aplicativo
scripts/package-windows.mjs  Geração do ZIP com executável Windows x64
tests/desktop-assets.test.mjs  Testes dos recursos offline
tests/desktop-smoke.mjs  Teste funcional de abertura e persistência no Electron
```

A arte é desenhada em Canvas; não há imagens, fontes, bibliotecas ou APIs remotas necessárias para jogar. Para ajustar o balanceamento, edite `SCYTHES`, `FARMS`, `GRASS`, `pickGrass` e `GROW_TIME` em `src/model.js`.
