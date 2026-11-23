# He4rt Hub (protótipo mockado)

Protótipo navegável do He4rt Hub: Vite, React 19 com React Compiler, TypeScript, React Router e
componentes baseados em Radix. Os dados ficam numa API exploratória em Bun + SQLite (`server/`).

- `/`: landing page
- `/app`: área do membro. Login com `ana@he4rt.dev` / `password`; `carla@basement.dev` e
  `pedro@jobfinder.dev` são contas criadas na Basement e no Job Finder (identidade compartilhada) que
  ainda não responderam as perguntas do Hub. GitHub usa OAuth quando configurado; Discord e Google
  são simulados somente em debug. Não há sincronização real com Basement/Job Finder nesta exploração.
- `/admin`: painel administrativo, com login próprio (`daniel@he4rt.dev` / `password`)

```sh
bun install
bun run api   # API na porta 3001 (HUB_DEBUG=1 liga o modo debug)
bun run dev   # Vite, com proxy de /api
```

A sidebar de debug (Alt+D) mostra as ações da tela atual, simula latência e falhas, reseta os dados
e lista o log de ações. O banco fica em `server/database/hub.sqlite`; `bun run db:fresh` recria com o
seed. `/api` mostra as tabelas somente com `HUB_DEBUG=1` e sessão administrativa. Não use debug com
dados sensíveis: ele permite personificação e alteração de fixtures. Sem debug, a API aplica os
guards separados de membro/admin e recorta o estado pela audiência.

No orb, `amp orb services ensure` inicia os serviços e publica os portais de landing, app e admin.
Fora do orb, execute API e Vite em terminais separados. `DB_PATH` permite um SQLite isolado e
`API_PORT` muda a porta da API; use o mesmo valor no Vite para configurar o proxy.

## Persistência e recuperação

Contas, trajetória, diário, fórum, squads, entregas, validações e eventos vivem em tabelas relacionais.
Edições/exclusões da trajetória preservam versões privadas. Migrações aditivas rodam ao abrir o banco;
não é necessário executar `db:fresh` para atualizar um banco existente. Esse comando apaga os dados.

Ações autenticadas recebem uma chave de idempotência com recibo por sessão/payload, válido por 48h.
Uma resposta perdida pode ser repetida sem executar novamente a transição. Inbox/outbox do GitHub
ficam no mesmo SQLite, com deduplicação, lease e retry; o worker inicia junto da API. Os efeitos
externos são reconciliáveis, não uma promessa de execução exatamente uma vez no GitHub.

## GitHub: login e integração são configurações separadas

- `HUB_PUBLIC_URL`: origem HTTPS pública usada nos callbacks e no manifest.
- **OAuth App de login:** `GITHUB_OAUTH_CLIENT_ID` e `GITHUB_OAUTH_CLIENT_SECRET`.
  Callback: `/api/github/oauth/callback`. Ele permite login sem exigir instalação do App de squads.
- **GitHub App de squads:** entre no `/admin` com debug habilitado e abra
  `/api/github/manifest?org=SUA-ORG&name=Nome-do-App`. O fluxo guarda as credenciais fora do repositório,
  em `~/.config/he4rt-hub/github-app.json`, ou no caminho `GITHUB_APP_CREDENTIALS`.
  Alternativamente, configure `GITHUB_APP_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
  `GITHUB_PRIVATE_KEY` e `GITHUB_WEBHOOK_SECRET` no ambiente, nunca em arquivos versionados.
- Instale o App na organização de testes e nos repositórios necessários. O manifest inclui conteúdo,
  administração, membros e Projects com escrita, PRs com escrita, issues/metadados e e-mails com
  leitura. Instalações existentes precisam aprovar permissões novas; recriar o manifest não as atualiza.
- `VITE_GITHUB_ORG` deve ser igual na API e no Vite. O teste de entrada usa
  `SUA-ORG/primeiro-commit`; os projetos usam repositórios/boards provisionados nessa organização.
  `GITHUB_BOARD_TEMPLATE_ID` permite copiar um Projects v2 existente.
- Webhook assinado: `/api/github/webhook` (alias `/webhooks/github`). O 202 confirma gravação durável,
  não conclusão do efeito. Staff consulta tentativas em `/api/github/jobs`, sem payloads privados.
- Contas antigas vinculadas apenas pelo handle precisam reconfirmar o OAuth para associar o ID
  numérico do GitHub. Renomear um usuário não pode transferir sua identidade para outra pessoa.

## Recuperação de senha e confirmação de e-mail

Por padrão, mensagens ficam na caixa local privada, em `<DB_PATH>.mail.sqlite`, sem envio externo.
Com debug e sessão administrativa, `/api/debug/mail` permite inspecionar os links. Tokens são
aleatórios, de uso único, expiram em 60 minutos e ficam vinculados ao e-mail atual. O GET de
confirmação não consome o token; a confirmação exige POST. Recuperar senha revoga sessões de membro,
sem confundir o guard administrativo independente.

Para envio externo opt-in via Resend, configure `MAIL_TRANSPORT=resend`, `MAIL_RESEND_API_KEY`,
`MAIL_FROM` e `APP_URL` HTTPS. O worker tenta novamente até cinco vezes. Aceitação pelo provedor não
comprova entrega na caixa do destinatário. `MAIL_DB_PATH` muda o caminho da caixa privada.

Eventos de produto são persistidos em `analytics_events`; não há envio automático ao PostHog ou
Clarity. Provedores sociais adicionais, MFA e identidade externa compartilhada não estão integrados.

## Verificação

```sh
bun test
bun run build
bun run lint
```

As suítes HTTP usam SQLite descartável em `.amp/in/orb-backup/`, cookies reais e debug desligado.
O contrato GitHub usa um servidor HTTP fake: cobre assinatura, replay, lease/restart, retry,
provisionamento, créditos e reconciliação, mas não substitui o aceite numa instalação GitHub real.

As convenções do projeto estão em [AGENTS.md](./AGENTS.md).
