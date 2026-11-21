# He4rt Hub (protótipo mockado)

Protótipo navegável do He4rt Hub: Vite, React 19 com React Compiler, TypeScript, React Router e
componentes baseados em Radix. Os dados ficam numa API exploratória em Bun + SQLite (`server/`).

- `/`: landing page
- `/app`: área do membro. Login com `ana@he4rt.dev` / `password`; `carla@basement.dev` e
  `pedro@jobfinder.dev` são contas criadas na Basement e no Job Finder (identidade compartilhada) que
  ainda não responderam as perguntas do Hub. Discord, GitHub e Google são simulados.
- `/admin`: painel administrativo, com login próprio (`daniel@he4rt.dev` / `password`)

```sh
bun install
bun run api   # API na porta 3001 (HUB_DEBUG=1 liga o modo debug)
bun run dev   # Vite, com proxy de /api
```

A sidebar de debug (Alt+D) mostra as ações da tela atual, simula latência e falhas, reseta os dados
e lista o log de ações. O banco fica em `server/database/hub.sqlite`; `bun run db:fresh` recria com o
seed, e `/api` mostra as tabelas.

As convenções do projeto estão em [AGENTS.md](./AGENTS.md).
