# He4rt Hub

Sistema visual do He4rt Hub, a plataforma que registra a trajetória dos membros da He4rt Developers: o que cada pessoa aprendeu, praticou, entregou e teve validado por gente de verdade. "Da comunidade para a comunidade" é a âncora. O sistema serve o app do membro, o painel de capitão e validador e o painel administrativo.

## Princípios visuais

1. **Trajetória, não placar.** Nada no visual estimula competição: sem ranking, sem medalha brilhante, sem barra de progresso competindo por atenção. XP aparece em `text-muted`, sempre com a palavra *reconhecimento* por perto.
2. **Roxo com peso, não com brilho.** A identidade roxa vive em dois lugares: a sidebar em `ink` (o roxo mais escuro) e a ação primária em `brand`. O resto da tela é quase neutro (`bg`, `surface`, `border`) para que o conteúdo, que é texto de pessoas sobre pessoas, respire. Sem gradientes.
3. **Evidência é texto, texto se lê.** Validações, retornos e anotações são lidos pelo membro. Tipografia de corpo em Inter 14/21, colunas no máximo ~720px, muted sempre acima de 4.5:1.
4. **Bordas, não sombras.** Cards, inputs e divisores usam `border`. A única sombra do sistema é a da tab ativa.
5. **Cada informação tem um dono.** O que vem do GitHub (repositório, PR, board) aparece sempre em `mono` com a referência inteira e um link "Abrir no GitHub"; o que é do Hub (pessoas, candidaturas, entregas aceitas, validações) aparece em `sans`. O leitor sabe de onde cada coisa veio só pela fonte.

## Cor

- Os neutros vêm de uma paleta cinza: #F2F2F2, #BFBFBF, #8C8C8C, #404040 e #0D0D0D (`--gray-100` a `--gray-900`). No claro, o fundo da página é `bg` (#F2F2F2) e os cards são `surface` branco por cima dele.
- `brand` (#6A2FE0) é só para a ação principal de cada tela e para o item ativo da navegação. Uma por tela.
- `brand-soft` + `brand-soft-text` marcam competências (critérios de avaliação) e seleção em listas. Competência é a única coisa que ganha chip roxo; estados usam a família semântica.
- Estados: `success` (aprovado, aceito, merged, registrada), `warning` (pendente, devolvida, vacancy, obrigatório), `info` (em andamento: aguardando revisão, atribuído), `neutral` (inativo, rascunho, não técnica). Cores que precisam ser distinguidas também diferem em luminosidade.
- Recusar e devolver usam `danger-text` sobre `surface` com `border-strong`. Nunca botão vermelho sólido: a ação exige motivo, e o visual pede a mesma calma.
- O tema escuro fica perto do preto: a página abaixo de #0D0D0D, os cards e a sidebar em #0D0D0D, texto #F2F2F2 e apoio #BFBFBF. A sidebar acompanha o tema: branca com texto #0D0D0D no claro, #0D0D0D no escuro, separada da página por uma borda. O membro escolhe o tema no menu; sem escolha, vale o do sistema.
- Por enquanto o roxo fica só no logo, na ação principal e no item ativo da navegação. Chips de competência, avatares, pontos da trilha e o anel de foco usam os neutros.
- No Feed e nas discussões de projeto do Fórum, azul orienta contexto, documentos e conversa; âmbar destaca a dúvida no Fórum e o marcador de uma publicação salva. Nas reações, verde significa “Isso me ajudou”, azul acompanha aprendizado e âmbar acompanha “Inspirador”. A cor fica nos ícones, links e fundos discretos; ícone e rótulo explicam o significado sem depender dela. Um projeto pessoal nunca recebe verde de aprovação ou validação.

## Tipografia

- **Space Grotesk** para títulos (`display`, `stat`, `title`, `heading`, `subheading`). `stat` existe para números que são conteúdo (capacidade do validador), nunca para placar de perfil. Geométrica e com personalidade de dev, sem parecer corporativa.
- **Inter** para todo o texto corrido e controles.
- **JetBrains Mono** exclusivamente para referências ao GitHub (`he4rt/painel-eventos#31`), nomes de time (`squad-orbita`) e atalhos.
- Fontes hospedadas no Google Fonts: Inter 400–700, Space Grotesk 500–700, JetBrains Mono 400–500.

## Layout

- Shell: sidebar fixa de `sidebar-w` (272px) em `ink` à esquerda; `main` com topbar de `topbar-h` e conteúdo com padding `space-8` e largura máxima `content-max`.
- Em telas estreitas a sidebar empilha acima do conteúdo (flex-wrap); a topbar quebra linha; boards largos rolam dentro de uma caixa.
- Grid de conteúdo: 2 colunas (7/5 ou 8/4) para contexto + ação; 3 colunas para cards de projeto; 4 para resumo.

## Sidebar

A sidebar é a espinha do produto e segue a jornada do `PRODUCT.md`:

| Grupo | Itens | Regra |
| --- | --- | --- |
| Trajetória | Início, Meu perfil, Trajetória, Diário de aprendizado | sempre visíveis |
| Desenvolvimento | Squads, Meu squad, Minhas validações | sempre visíveis |
| Gestão do squad | Candidaturas recebidas, Entregas para revisar | só aparece para o capitão, com contagem |
| Oportunidades | Vagas exclusivas | com cadeado até o membro ter squad ou validação |
| Validador | Fila de validação, Registradas por mim | só aparece para validador habilitado |

Abaixo dos grupos, um card "Quero validar" em `ink-2` para quem ainda não é validador. No rodapé, o membro: avatar, nome, `@github · papel`. O grupo do capitão leva o nome do que se faz nele, não do cargo; o nome do squad entra no item ("Candidaturas recebidas, Loja Comunitária") apenas para quem conduz mais de um.

## O que o Hub não faz (anti-padrões)

Lista de tells de interface genérica que esta UI evita de propósito. Quem for construir uma tela nova confere aqui antes.

- **Placar.** Nada de fileira de cartões com número grande e rótulo pequeno. O Início abre com a trajetória da pessoa (o TrailLog na horizontal), e resumo vira frase: "1 validação registrada, publicada no perfil".
- **Metadados encadeados com ponto-médio** (`A · B · C`). Metadado é frase curta com vírgula e ponto, ou duas linhas. Contagem em aba vai entre parênteses: `Entregas (2)`.
- **Rótulo em caixa alta com tracking** acima de seções. Rótulos de grupo usam `group-label` em caixa normal; seções dentro de card usam `subheading` em Space Grotesk.
- **Seta `→` em botão ou link.** O texto do botão diz o que acontece: "Enviar candidatura", e pronto.
- **Ícone em caixinha colorida** ao lado de cada item de lista. Lista é texto com um fio `border` entre itens.
- **Gradiente, sombra em tudo, borda esquerda colorida em card.** A única sombra é a da tab ativa; destaque é fundo sólido ou borda `brand-soft-border`.
- **Uma palavra colorida no título.** O nome é He4rt Hub, em uma cor. A marca é o quadrado com o 4, não a letra destacada.
- **Monospace decorativa.** `mono` só para referências ao GitHub, que é informação (de onde o dado veio), nunca para rótulos pequenos ou atalhos.
- **Copy de slogan sob o título.** A linha abaixo do título da página diz algo que a pessoa usa ("Toda recusa vem com retorno") ou não existe.

## Iconografia

Ícones em traço (stroke 1.75, 24 viewBox), inline SVG, tamanho 18 na navegação e 16 em chips e botões. Sem emoji. Os ícones de GitHub são `merge` e `branch`; não se desenha a marca do GitHub.

## Vocabulário na interface

A pessoa é **membro**; o time é **squad**; quem conduz é **capitão**; o registro de avaliação é **validação**; quem registra é **validador**; a publicação do feed é **publicação**; a insígnia é **conquista**; o registro de evolução é **trajetória**; o que sustenta uma validação é **evidência**. **Vacancy** é squad sem capitão. Nunca: certificado, nota, aprovação, selo, talento, job board. O nome é sempre **He4rt**, com o 4.

## Voz

Direta, honesta e de comunidade. Fala com o membro como colega: "Você decide quem entra" em vez de "O usuário poderá selecionar". Toda recusa vem acompanhada de caminho ("o que fortalecer para a próxima"). O Hub nunca promete prazo que os voluntários não conseguem cumprir, e a interface diz isso.
