# He4rt Hub (protótipo mockado)

Protótipo navegável do He4rt Hub: Vite, React 19 com React Compiler, TypeScript, React Router e
componentes baseados em Radix. Todos os dados e ações são mockados no navegador.

- `/`: landing page
- `/app`: área do membro (login com qualquer usuário mockado e a senha `password`)
- `/admin`: painel administrativo

```sh
bun install
bun run dev
```

A sidebar de debug (Alt+D) mostra as ações da tela atual, simula latência e falhas, reseta os dados
e lista o log de ações.

As convenções do projeto estão em [CLAUDE.md](./CLAUDE.md).
