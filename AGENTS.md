# He4rt Hub (protótipo mockado)

**Antes de qualquer tarefa, leia `PRODUCT.md` e `PRODUCT_METRICS.md` na raiz.** Eles dizem o que o produto
é e como o sucesso é medido; use-os para decidir o que construir e como cada tela deve se comportar.

SPA em Vite + React 19 (React Compiler) + TypeScript + React Router, servida em três ambientes:

| Rota       | Módulo                     | Equivalente no Laravel                |
| ---------- | -------------------------- | ------------------------------------- |
| `/`        | `src/modules/landing`      | landing page                          |
| `/app`     | `src/modules/panel-app`    | `app-modules/panel-app/resources/js`  |
| `/admin`   | `src/modules/panel-admin`  | `app-modules/panel-admin/resources/js`|

**O backend é exploratório.** As ações dos `actions.ts` rodam numa API em Bun + SQLite (`server/`), que
grava no banco relacional e devolve o estado que a tela lê com `useDb`. Toda ação aparece no painel de
debug. O modelo e as regras continuam sendo os do protótipo, para portar ao Laravel.

O objetivo é que cada tela daqui seja portada para o Laravel sem redesenho: mesma estrutura de pastas,
mesmos recursos e o mesmo comportamento. Na dúvida, faça como o Laravel faria.

## Comandos

Use sempre **Bun**, nunca npm, pnpm ou yarn.

```sh
bun install          # dependências (bun.lock é o lockfile)
bun run dev          # dev server
bun run build        # typecheck (tsc -b) + build
bun run lint         # oxlint
bun add <pkg>        # nova dependência
bun run api          # API (server/) em watch, na porta 3001
bun run db:fresh     # recria o SQLite com o seed do protótipo
```

Antes de concluir uma mudança, rode `bun run build` e `bun run lint`.

No orb, `amp orb services ensure` sobe o dev server declarado em `.amp/services.yaml` com portais para
`/`, `/app` e `/admin`.

## Backend (`server/`)

A API em Bun + SQLite (`bun:sqlite`) roda ao lado do Vite, que faz proxy de `/api` (mesma origem, cookies
de primeira parte).

- `server/database/schema.sql` é o modelo relacional de todo o `MockDb`, com nomes de tabela e coluna do
  Laravel (cada tabela vira uma migration). Mudou um tipo em `db.ts`? Mude o schema, o `write-state.ts`
  e o `read-state.ts` juntos. Valores calculados (completude, conquistas, jornada) não são gravados.
- Ações: o plugin do `vite.config.ts` envolve cada export dos `actions.ts` (e de `src/mocks/github.ts`)
  com `remote` (`src/mocks/api.ts`). No navegador, `mockAction` aplica latência, falha simulada e log,
  e manda a chamada para `POST /api/actions/<nome>`. A API (`server/actions.ts`) lê o estado do banco,
  roda a mesma função com o mesmo handler e grava o resultado numa transação. Então as checagens
  continuam na ação, e não há segunda implementação delas.
- A API confere quem age: ações do `panel-admin` exigem a sessão de admin da staff; o primeiro parâmetro
  `userId`, `actorId`, `memberId` ou `validatorId` tem de ser o usuário logado.
- Leitura: `GET /api/state` e cada resposta trazem o estado recortado para quem está logado (a staff vê
  tudo; o membro, o que é dele e o que os outros mostram à comunidade; o visitante, o público). Hash de
  senha nunca sai da API.
- Autenticação como os guards do Laravel: `web` (/app) e `admin` (/admin) com sessões e cookies
  separados, sessões na tabela `sessions`, senhas em bcrypt. Senha do seed: `password`.
- Modo debug (`HUB_DEBUG=1`, ligado no `.amp/services.yaml`): os atalhos de debug que mudam o store
  direto (“Entrar como Rafael”, “Esvaziar o fórum”) viram um patch em `POST /api/debug/state`, e
  “Resetar dados mockados” recarrega o seed. Sem ele, a API recusa os dois e os webhooks simulados.
- `/api` abre um explorador das tabelas.

## Estrutura

`src/` espelha `resources/js` do Laravel; cada módulo espelha `app-modules/<módulo>/resources/js`, para
que telas sejam portadas 1:1.

```
src
├── main.tsx                  # entrada: monta o RouterProvider
├── router.tsx                # compõe as rotas dos módulos
├── components                # componentes compartilhados entre módulos
│   └── ui                    # design system (Radix), será publicado como pacote
├── debug                     # sidebar de debug e useDebugActions
├── hooks                     # hooks compartilhados
├── lib                       # utilitários sem React (cn, store…)
├── mocks                     # store (db.ts), mockAction e o cliente da API (api.ts)
├── styles                    # tokens.css (design tokens) e base.css
└── modules
    └── <módulo>              # landing | panel-app | panel-admin
        ├── routes.tsx        # RouteObject do módulo
        ├── components        # componentes usados por várias features do módulo
        ├── features
        │   ├── auth          # telas de visitante; fica fora dos grupos
        │   ├── home          # dashboard do módulo; a única feature sem grupo
        │   └── <grupo>
        │       └── <feature>[/<sub-feature>]
        │           ├── actions.ts      # ações mockadas (o “controller”)
        │           ├── components      # componentes só desta feature
        │           ├── hooks
        │           └── pages           # uma página por arquivo
        ├── hooks
        ├── layouts
        └── lib
```

### Grupos e features

Toda feature fica num grupo: `features/<grupo>/<feature>/`, em kebab-case. Os grupos são os mesmos do
Laravel (`src/Features/<Group>/<Feature>/`):

| Módulo        | Grupo     | Features                                   |
| ------------- | --------- | ------------------------------------------ |
| `panel-admin` | `setup`   | `users`, `teams`, `roles`                  |
| `panel-admin` | `system`  | `activity`, `mails`, `settings`, `docs`, `github` |
| `panel-admin` | `squads`  | `squads` (com `projects`), `entry-tests`   |
| `panel-admin` | `validation` | `validators`, `queue`, `reviews`, `contestations` |
| `panel-admin` | `account` | `profile`                                  |
| `panel-app`   | `account` | `settings`, `two-factor-setup`             |
| `panel-app`   | `community` | `feed`, `discussions`                    |
| `panel-app`   | `squads`  | `squads` (com `applications`, `deliveries`, `members`, `projects`), `applications`, `entry-test` |
| `panel-app`   | `validation` | `validations`, `requests`, `queue`, `validator-application` |
| `landing`     | `community` | `profiles` (o perfil público único, `/members/:username`) |
| `landing`     | `squads`  | `squads` (com `projects`), as páginas públicas de squad e projeto |

No `panel-app`, a home (`/app`) é o Feed (`community/feed`), com o perfil e os blocos do momento do
membro nas laterais; não há feature `home`.

O perfil público é um só, em `/members/:username` (`landing/community/profiles`): lê a identidade do
`User` e os registros da trajetória, com recorte por quem lê (dono, membro, visitante). O que o perfil e
a home dividem (trajetória, visibilidade, datas, evidências) fica em `src/lib`. Squads e validação
seguem `docs/squads.md` e `docs/validation.md`; conquistas e jornada são calculadas em
`src/mocks/achievements.ts`, nunca semeadas.

- Ao planejar uma feature nova, sugira o grupo e diga por quê. Quando nenhum grupo serve, sugira um novo
  e pergunte antes de criar.
- Um grupo é um agrupamento estável, não o título da seção no menu. Não mova a feature quando só o
  título muda.
- O nome da página não leva o grupo: `features/setup/users/pages/index.tsx` é a página `users/index`.
- Uma parte da feature com recursos e tipos próprios é uma sub-feature com a mesma estrutura:
  `features/setup/teams/members/`.
- Crie só as pastas que a feature usa; não deixe pastas vazias.

### Fronteiras

- O código fica no nível mais baixo que o usa: feature → módulo (`components`, `hooks`, `lib`) → `src/`.
  Suba um nível só quando um segundo consumidor precisar, mesmo que as duas features estejam no mesmo
  grupo.
- Uma feature nunca importa o interior de outra feature.
- Um módulo nunca importa de outro módulo. O que for compartilhado sobe para `src/`.
- Ignore o Wayfinder e o `generated/` do Laravel: as rotas são declaradas no `routes.tsx` de cada
  módulo, e os links usam caminhos literais (`/app/settings/profile`).
- Ao mover uma feature, mantenha as URLs.

## Convenções de código

- Arquivos e pastas em kebab-case: `settings-layout.tsx`, `use-account.ts`.
- Páginas usam `export default` (igual às páginas Inertia); todo o resto usa exports nomeados.
- Imports absolutos com `@/` (`@/components/ui/button`, `@/modules/panel-app/hooks/use-account`).
  Use caminho relativo só para arquivos da mesma feature (`../actions`, `../components/users-table`)
  e no `routes.tsx` do módulo (`./features/...`).
- Imports sem extensão.
- Formulários usam `<form action>` + `useActionState` do React 19.
- Texto de interface em português (pt-BR); código, nomes e comentários em inglês.

### Renderização

- O React Compiler está ligado e memoiza sozinho: não use `useMemo`, `useCallback` nem `memo`.
- Derive valores das props durante o render, ou resete uma subárvore com `key`. Nunca copie props para
  state com um efeito.
- Leia `window`, `matchMedia`, `localStorage` ou a hora por `useSyncExternalStore` (ou um hook baseado
  nele, como `useStore`), nunca durante o render nem num efeito de montagem que seta state.
- Nunca declare um componente dentro de outro.
- Uma lista que adiciona, remove ou reordena itens usa um id estável como `key`, nunca o índice. Linha
  nova sem id ganha um `rowId` só do cliente (`crypto.randomUUID()`), removido antes de enviar à ação.

## Componentes (`src/components/ui`)

- Antes de criar um componente, reuse o que já existe em `src/components` e `src/components/ui`.
- Todo componente do design system usa um primitivo do Radix (`radix-ui`) quando ele existe
  (Dialog, Select, Switch, Tabs, Tooltip…). Só use elemento nativo quando o Radix não tem primitivo
  (Input, Card, Table), e diga isso num comentário de uma linha.
- Repasse as props do primitivo (`ComponentProps<typeof X.Root>`) e aceite `className` via `cn()`.
  Variações são props (`variant`, `size`) refletidas em `data-*`, nunca classes diferentes.
- Ofereça `asChild` (Radix `Slot`) quando o componente puder envolver um `Link`.
- `ui/` não importa nada de `modules/`, `mocks/` nem `debug/`: estes componentes serão publicados.
- Telas usam os componentes de `ui/`; não estilize elementos nativos direto nas features quando já
  existe um componente.

## Estilo

A base visual é o **He4rt Hub Design System**, em `docs/design-system/`: leia o `README.md` (princípios,
cor, tipografia, layout, sidebar, anti-padrões, vocabulário) e o `estados.md` antes de criar ou mudar
uma tela, e o `.md` e o `.preview.html` de cada componente em `docs/design-system/components/`.

- Cores, espaçamentos, raios, fontes e sombras vêm só de `src/styles/tokens.css` (`var(--…)`), com os
  nomes do design system (`--bg`, `--surface`, `--brand`, `--text-muted`…). Nada de cor, fonte ou raio
  soltos fora dele. Texto usa os estilos (`font: var(--text-body)`, `var(--text-caption)`…).
- Bordas, não sombras: cards e inputs usam borda. As únicas sombras são `--shadow-tab` (tab ativa) e
  `--shadow-float` (menus, popovers e dialogs). Uma lista com "Carregar mais" esmaece os últimos itens
  com `--fade-continuation`. Página em `--bg`, cards em `--surface`, bloco rebaixado em `--surface-2`.
- `--brand` só no logo, na ação principal da tela e no item ativo da navegação. Links e referências ao
  GitHub usam `--brand-text` (roxo). Estado de domínio usa `<StateChip>` (`src/components/state-chip.tsx`),
  que segue o `estados.md`; chip roxo (`--brand-tint`) é só competência e área (`<Badge variant="comp">`).
- Fonte Geist em tudo; `--font-mono` (Geist Mono) só para referência ao GitHub (repositório, PR, commit,
  time). Sem serifa.
- Toda mudança de estado é suave (hover, abrir e fechar, trocar de vista, trocar de tema), com os tokens
  `--dur-*` e `--ease-*` e View Transitions na navegação e no tema. `prefers-reduced-motion` desliga tudo
  (`base.css`).
- Siga a lista "O que o Hub não faz" do `README.md`: sem placar de números, sem metadado encadeado com
  `·`, sem rótulo em caixa alta com tracking, sem seta em botão, sem ícone em caixinha colorida, sem
  borda esquerda colorida, sem gradiente.
- CSS puro, um arquivo ao lado do componente (`button.tsx` + `button.css`), importado pelo componente.
- Classes prefixadas pelo nome do componente, no estilo BEM: `.users-table`, `.users-table__empty`.
  Componentes de `ui/` usam o prefixo `ui-`.
- Estados vêm dos atributos do Radix (`[data-state='checked']`) ou de `data-*` próprios.

## Layout estável

Nada pisca, pula, corta ou se reorganiza no primeiro carregamento, na navegação nem depois de uma ação.

- Um controle tem o mesmo tamanho desabilitado, carregando ou habilitado. Mantenha o rótulo fixo e
  coloque um spinner ao lado, em vez de trocar o texto: use `<Button loading>`.
- UI condicional (banner, erro, confirmação inline) reserva seu espaço ou sobrepõe o conteúdo. Uma
  confirmação inline cabe no espaço do controle que ela substitui. O resultado de um formulário ou
  ação usa `<FormMessage>`, que reserva a linha mesmo vazio.
- Logo depois de uma ação, o controle sob o ponteiro não vira um controle destrutivo.
- Números, contagens e contadores usam `font-variant-numeric: tabular-nums`.
- Texto longo (nome, e-mail, URL) usa `min-width: 0` com `text-overflow: ellipsis` ou `line-clamp`, e o
  texto completo no `title`.
- Dialog e popover ficam limitados à viewport (`dvh`) e rolam por dentro, com header e footer fixos
  quando as ações sairiam da tela. Sem barra de rolagem dupla e sem rolar a página por trás.
- A página cabe na largura de um celular; uma tabela larga rola dentro da própria caixa.
- Input usa pelo menos 16px de fonte abaixo de 768px, para o iOS não dar zoom.

## Mocks

- O store é `db` em `src/mocks/db.ts`, com o estado que a API mandou. Os tipos dele espelham as Data
  classes do Laravel que a página vai receber (mesmos campos; datas em ISO 8601).
- Leitura é síncrona, como as props de uma página Inertia: use `useDb(selector)`. O selector deve
  devolver um valor que já existe no estado (filtre e conte fora dele) para não re-renderizar em loop.
  Nunca carregue dados num efeito de montagem.
- Busca, filtro e paginação ficam na URL (`useSearchParams`) e são aplicados no cliente.
- Toda escrita fica numa função exportada do `actions.ts` da feature e passa por
  `mockAction(nome, input, handler)`, chamado antes de qualquer `await`. Ela aplica a latência
  configurada, falha quando “Falhar próxima ação” está ligado, registra a chamada no log e roda o
  handler na API. O handler só usa o que vem nos argumentos e no `db`, porque roda no servidor.
- Uma intenção do usuário é uma ação mockada.

### Ações mockadas = controllers

- O nome da ação é `<módulo>.<recurso>.<verbo>`, com os verbos REST do controller que ela vai virar:
  `index`, `show`, `store`, `update`, `destroy`. Ex.: `panel-admin.users.destroy`,
  `panel-app.settings.profile.update`, `panel-app.session.store` (login).
- Nunca invente um verbo: encontre o recurso que a ação cria, altera ou remove. Personificar um usuário
  é `panel-admin.users.impersonation.store`, não `users.impersonate`.
- A função exportada mantém o nome de negócio (`deleteUser`, `login`).
- As checagens (permissão e validação) ficam na ação, nunca na página. Um erro esperado lança
  `MockError` com a mensagem para o usuário; a página só mostra `errorMessage(error)`.
- Quando a ação recusa algo, a UI esconde ou desabilita o controle lendo a mesma regra, para um botão
  nunca aparecer para uma ação que será recusada.
- Um botão que dispara uma ação fica desabilitado enquanto ela roda, para um duplo clique não enviar
  duas vezes.
- Novos dados de seed entram em `seed` no `db.ts`. Rode `bun run db:fresh` (ou clique em “Resetar dados
  mockados”) para ver o novo seed.

## Sidebar de debug

`src/debug/debug-sidebar.tsx` fica ao lado de todas as telas (Alt+D abre e fecha). Ela mostra as ações
da tela atual, os controles de simulação (latência, falhar próxima ação, resetar dados) e o log de ações.

**Toda página nova registra suas ações de debug** com `useDebugActions(título, ações)`: atalhos que
levam a tela a cada estado relevante, como preencher o formulário com dados válidos ou inválidos,
gerar muitos registros, esvaziar a lista, expirar a sessão ou disparar um erro esperado.

```tsx
useDebugActions('Usuários', [
  { label: 'Criar 10 usuários', run: () => createUsers(10) },
  { label: 'Remover um admin (erro esperado)', run: () => deleteUser(adminId) },
])
```

## Antes de concluir

- Rode `bun run build` e `bun run lint`.
- Abra as telas afetadas no navegador em 1440×900, 1366×650 e 390×844, no tema claro e no escuro.
- Use as ações de debug para passar por cada estado: vazio, erro, carregando (latência de 3000ms) e
  com muitos dados.
- Abra, selecione, feche e abra de novo cada overlay que você mudou, com teclado e com toque.

## Commits

Todo commit termina com os dois co-autores, nesta ordem, depois de uma linha em branco:

```text
Co-authored-by: Dandan <d.mariano.costa@gmail.com>
Co-authored-by: 7K <zthetr7k@gmail.com>
```

Não deixe no commit trailers de ferramenta, como `Amp-Thread-ID` ou `Co-Authored-By` de um modelo.
Quando a ferramenta acrescenta um sozinho, remova antes do push.
