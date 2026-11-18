# He4rt Hub (protótipo mockado)

SPA em Vite + React 19 (React Compiler) + TypeScript + React Router, servida em três ambientes:

| Rota       | Módulo                     | Equivalente no Laravel                |
| ---------- | -------------------------- | ------------------------------------- |
| `/`        | `src/modules/landing`      | landing page                          |
| `/app`     | `src/modules/panel-app`    | `app-modules/panel-app/resources/js`  |
| `/admin`   | `src/modules/panel-admin`  | `app-modules/panel-admin/resources/js`|

**Tudo é mockado.** Não existe backend, API nem `fetch`. Toda ação “acontece” no banco fake em memória
(`src/mocks/db.ts`, persistido no localStorage) e aparece no painel de debug.

## Comandos

Use sempre **Bun**, nunca npm, pnpm ou yarn.

```sh
bun install          # dependências (bun.lock é o lockfile)
bun run dev          # dev server
bun run build        # typecheck (tsc -b) + build
bun run lint         # oxlint
bun add <pkg>        # nova dependência
```

Antes de concluir uma mudança, rode `bun run build` e `bun run lint`.

No orb, `amp orb services ensure` sobe o dev server declarado em `.amp/services.yaml` com portais para
`/`, `/app` e `/admin`.

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
├── mocks                     # backend fake: db.ts e mock-action.ts
├── styles                    # tokens.css (design tokens) e base.css
└── modules
    └── <módulo>              # landing | panel-app | panel-admin
        ├── routes.tsx        # RouteObject do módulo
        ├── components        # componentes usados por várias features do módulo
        ├── features
        │   └── <feature>[/<sub-feature>]
        │       ├── actions.ts      # ações mockadas (o “controller”)
        │       ├── components      # componentes só desta feature
        │       └── pages           # uma página por arquivo
        ├── hooks
        ├── layouts
        └── lib
```

Exemplo, seguindo o panel-app do Laravel: `features/account/settings/{components,pages}`,
`features/auth/{components,pages}`, `features/home/pages/{dashboard,welcome}.tsx`,
`layouts/{app-layout,auth-layout}.tsx`, `hooks/use-account.ts`.

Regras:

- Crie só as pastas que a feature usa; não deixe pastas vazias.
- O código fica no nível mais baixo que o usa: feature → módulo → `src/`. Suba um nível só quando um
  segundo consumidor precisar.
- Um módulo nunca importa de outro módulo. O que for compartilhado sobe para `src/`.
- Ignore o Wayfinder e o `generated/` do Laravel: as rotas são declaradas no `routes.tsx` de cada
  módulo, e os links usam caminhos literais (`/app/settings/profile`).

## Convenções de código

- Arquivos e pastas em kebab-case: `settings-layout.tsx`, `use-account.ts`.
- Páginas usam `export default` (igual às páginas Inertia); todo o resto usa exports nomeados.
- Imports absolutos com `@/` (`@/components/ui/button`, `@/modules/panel-app/hooks/use-account`).
  Use caminho relativo só para arquivos da mesma feature (`../actions`, `../components/users-table`)
  e no `routes.tsx` do módulo (`./features/...`).
- Imports sem extensão.
- O React Compiler memoiza automaticamente: não use `useMemo`, `useCallback` nem `memo`.
- Formulários usam `<form action>` + `useActionState` do React 19.
- Texto de interface em português (pt-BR); código, nomes e comentários em inglês.

## Componentes (`src/components/ui`)

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

O CSS será trocado por um novo design system, então mantenha-o isolado e substituível:

- Cores, espaçamentos, raios, fontes e sombras vêm só de `src/styles/tokens.css` (`var(--…)`).
  Nada de valores de cor soltos fora dele.
- CSS puro, um arquivo ao lado do componente (`button.tsx` + `button.css`), importado pelo componente.
- Classes prefixadas pelo nome do componente, no estilo BEM: `.users-table`, `.users-table__empty`.
  Componentes de `ui/` usam o prefixo `ui-`.
- Estados vêm dos atributos do Radix (`[data-state='checked']`) ou de `data-*` próprios.

## Mocks

- O banco fake é `db` em `src/mocks/db.ts`. Leia nos componentes com `useDb(selector)`; o selector deve
  devolver um valor que já existe no estado (filtre e conte fora dele) para não re-renderizar em loop.
- Toda ação que no sistema real chamaria o backend fica no `actions.ts` da feature e passa por
  `mockAction(nome, input, handler)`. Ela aplica a latência configurada, falha quando “Falhar próxima
  ação” está ligado e registra a chamada no log de debug.
- Nomeie ações como `<módulo>.<feature>.<ação>`: `panel-admin.users.delete`.
- Erros esperados (validação, permissão) lançam `MockError` com a mensagem para o usuário; mostre-a
  com `errorMessage(error)`.
- Novos dados de seed entram em `seed` no `db.ts`. Quem já abriu o app precisa clicar em “Resetar dados
  mockados” para ver o novo seed.

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

## Verificação

Mudança visual: rode o app, abra as telas afetadas, use as ações de debug para passar pelos estados
(vazio, erro, carregando, com dados) e confira o resultado no navegador.
