# He4rt Hub (protótipo mockado)

Protótipo navegável do He4rt Hub: Vite, React 19 com React Compiler, TypeScript, React Router e
componentes baseados em Radix. Todos os dados e ações são mockados no navegador.

- `/`: landing page
- `/app`: área do membro. Login com `ana@he4rt.dev` / `password`; `carla@basement.dev` e
  `pedro@jobfinder.dev` são contas criadas na Basement e no Job Finder (identidade compartilhada) que
  ainda não responderam as perguntas do Hub. Discord, GitHub e Google são simulados.
- `/admin`: painel administrativo, com login próprio (`daniel@he4rt.dev` / `password`)

```sh
bun install
bun run dev
```

A sidebar de debug (Alt+D) mostra as ações da tela atual, simula latência e falhas, reseta os dados
e lista o log de ações, incluindo os eventos que iriam para o PostHog (`posthog: …`). O banco mockado
fica no localStorage em `he4rt:mock-db:v4`.

As convenções do projeto estão em [AGENTS.md](./AGENTS.md).
