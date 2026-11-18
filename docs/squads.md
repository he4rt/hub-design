# Squads

Spec da etapa 2 do `PRODUCT.md` (Squads e validação), parte de squads. A validação está em
[`validation.md`](./validation.md). Este documento é o "documento complementar de squads" que o
`PRODUCT.md` cita: comportamento exato, limites e exceções.

Toda URL, ação e evento abaixo é proposta para o protótipo mockado e para o port no Laravel. Nada
aqui depende de backend real: no protótipo, o GitHub é simulado pelo banco fake e por ações de debug.

## Resumo

- O projeto nasce no Hub, com objetivo final, critérios de aceite e critérios de avaliação. Um
  GitHub App da He4rt cria o repositório e o board na organização, e os webhooks trazem cada tarefa
  de volta.
- Cada informação tem um único dono. Código, PRs e board ficam no GitHub, e o Hub mostra o board só
  para leitura. Pessoas, capitão, candidaturas, entregas aceitas e log ficam no Hub.
- Para entrar num squad são duas camadas: o **teste de entrada** (um PR merged num repositório da
  He4rt, revisado por qualquer pessoa da staff) e a **candidatura**, que o capitão aceita ou recusa
  sempre com retorno.
- O capitão aceita entregas contra os critérios de aceite e registra quem fez o quê. Esse registro é
  o contexto que o validador lê.
- O admin inicia o projeto e aloca o capitão. O super admin pode tudo, e cada ação dele sobre pessoas
  entra no log do squad com autor e motivo.

## Decisões

| Tema | Decisão | Origem |
| --- | --- | --- |
| Onde o projeto nasce | No Hub, com campos padronizados: objetivo, critérios de aceite e de avaliação | Daniel, rodada 1 |
| GitHub | Obrigatório para todo mundo na plataforma | Daniel, rodada 1 |
| Teste de entrada | Um PR merged num repositório da organização He4rt, revisado por uma pessoa, sem merge automático | Daniel, rodadas 1 e 2 |
| Quem revisa o teste | Qualquer pessoa da staff da He4rt | Daniel, rodada 3 |
| Seleção | O capitão decide 100%, por candidatura com perguntas dele | Daniel, rodada 1 |
| Recusa | Sempre com motivo e retorno construtivo; um "não" sozinho não é enviado | Daniel, rodada 1 |
| Anotações do capitão | Pontos fortes e de melhoria visíveis ao membro, ao capitão e à administração | Daniel, rodada 2 |
| Acesso ao repositório | Dado quando o capitão aceita a candidatura | Daniel, rodada 1 |
| Admin e super admin | Admin inicia o projeto e aloca o capitão; super admin faz tudo | Daniel, rodada 1 |
| Grupo de código | `squads` (e `validation` para a validação) | Daniel, rodada 2 |

### Suposições que o Daniel pode vetar

- **Staff** é quem acessa o painel admin: os papéis `admin` e `super-admin`. Hoje `User.role` só tem
  `admin` e `member`; o papel `super-admin` é novo.
- Um membro pode estar em mais de um squad ao mesmo tempo, desde que o capitão de cada um aceite.
- O membro pode sair do squad sozinho. Tirar alguém do squad é só do super admin; o capitão não tira.
- O teste de entrada vale para sempre e para qualquer squad, como o XP "uma vez" do
  `PRODUCT_METRICS.md`.
- O motivo e o "o que fortalecer" da recusa têm pelo menos 30 caracteres cada, para não virarem
  "boa sorte".
- Uma entrega creditada só ao capitão é aceita pelo super admin, não pelo próprio capitão.

### Mudanças no `PRODUCT.md`

O `PRODUCT.md` já traz estas decisões: GitHub obrigatório para todos, staff e super admin entre os
papéis, projeto com objetivo e critérios, e a entrada em duas camadas. Ficam fora desta spec:

- O onboarding ainda não exige vincular o GitHub. Por enquanto, a página Teste de entrada pede o
  vínculo antes de começar.
- A identidade é compartilhada com a Basement e o Job Finder, e quem cuida dela precisa saber da
  nova exigência.

## Papéis e permissões

| Ação | Membro | Capitão | Staff (admin) | Super admin |
| --- | --- | --- | --- | --- |
| Ver squads, projetos e log públicos | sim | sim | sim | sim |
| Fazer o teste de entrada | sim | | | |
| Revisar e fazer merge do PR do teste (no GitHub) | | | sim | sim |
| Candidatar-se a um projeto | com teste aprovado | | | |
| Definir perguntas e lugares do projeto | | do próprio squad | | sim |
| Anotar, aceitar e recusar candidaturas | | do próprio squad | | sim |
| Aceitar ou devolver entregas | | do próprio squad | | sim |
| Editar responsabilidades dos membros | | do próprio squad | | sim |
| Sair do squad | sim | trocando o capitão antes | | |
| Criar squad e projeto, alocar capitão | | | sim | sim |
| Encerrar projeto | | do próprio squad | sim | sim |
| Trocar capitão, tirar ou realocar membro | | | | sim |
| Sincronizar com o GitHub | | | sim | sim |

O capitão é um papel por squad (`Squad.captainId`), não um valor de `User.role`. Squad sem capitão é
uma **vacancy**.

## Integração com o GitHub

### Dono de cada informação

| Informação | Dono | O outro lado |
| --- | --- | --- |
| Objetivo, critérios de aceite e de avaliação | Hub | Vão para o README do repositório criado |
| Repositório, branches, commits, PRs, revisões | GitHub | O Hub guarda link e autoria como evidência |
| Board: issues, colunas, responsáveis | GitHub | O Hub mostra uma cópia de leitura com "Abrir no GitHub" |
| Time do squad e acesso ao repositório | O Hub decide, o GitHub aplica | Mudança feita à mão no GitHub aparece como divergência para a staff |
| Squad, capitão, candidaturas, membros | Hub | |
| Entrega aceita e quem fez o quê | Hub | Vira crédito no README por PR do App |
| Log do squad e histórico do membro | Hub | |

- O membro é ligado ao GitHub pelo id numérico da conta, nunca pelo login, que pode mudar.
- O Hub não move card nem cria issue: editar nos dois lados faz as cópias divergirem.
- Os webhooks de Projects estão em *public preview* no GitHub. O Hub também reconcilia por varredura
  periódica pela API, e o que já foi aceito no Hub não depende do GitHub estar no ar.

### GitHub App da He4rt

- **Permissões:** Administration (criar repositório a partir do template), Contents e Pull requests
  (PR de créditos), Members (times e convites), Projects da organização (ler e escrever).
- **Webhooks:** `repository`, `pull_request`, `pull_request_review`, `issues`, `push`, `projects_v2`,
  `projects_v2_item`, `membership`, `organization`.
- **Endpoint:** `POST /webhooks/github`, com assinatura `X-Hub-Signature-256` verificada. Cada
  entrega é gravada pelo `X-GitHub-Delivery` para ser idempotente e processada em fila.

| Evento do GitHub | O que o Hub faz |
| --- | --- |
| `repository.created` + `projects_v2.created` | Projeto passa de `provisioning` a `active`; log "Projeto iniciado" |
| `pull_request.opened` (repositório do teste, autor sem teste aprovado) | Teste de entrada fica `open`; evento `squad_test_submitted` |
| `pull_request.closed` com `merged: true` (mesmo PR) | Teste fica `approved`; o membro pode se candidatar |
| `pull_request.closed` sem merge (mesmo PR) | Teste fica `closed`; o membro vê os comentários no GitHub e pode abrir outro |
| `projects_v2_item.created` / `edited` | Atualiza a cópia do board |
| `projects_v2_item.edited` para Status "Feito" | Cria entrega pendente (ver Entregas) |
| `organization.member_added` / `membership.added` | Convite aceito; candidatura passa a membro ativo, evento `squad_joined` |
| `membership.removed` sem ação no Hub | Divergência listada em Integração GitHub |

### Template do repositório e board modelo

- `he4rt/template-squad`: README com objetivo, critérios e a seção "Quem fez", template de PR,
  `CONTRIBUTING`, licença e CI básico.
- Board modelo da organização, copiado com `copyProjectV2` e ligado com `linkProjectV2ToRepository`
  e `linkProjectV2ToTeam`:

| Campo | Valores | Uso no Hub |
| --- | --- | --- |
| Status | Backlog, Pronto, Em andamento, Em revisão, Feito | "Feito" cria entrega pendente |
| Tipo | Técnica, Não técnica | Técnica exige PR merged; não técnica (documentação, design, facilitação) não |
| Critério | Critérios de aceite do projeto | Liga a entrega ao critério que ela cumpre |
| Responsáveis | assignees | Pré-preenche o crédito |

## Fluxos

### Criar projeto

1. O admin abre **Novo projeto** num squad e preenche: nome, objetivo final, critérios de aceite,
   critérios de avaliação (competências), stack, nível esperado, lugares, capitão e repositório
   (criar a partir do template ou vincular um existente da organização).
2. O projeto nasce `provisioning`. O App cria ou vincula o repositório, copia o board, cria o time
   `squad-<slug>`, dá `maintain` ao capitão e escreve objetivo e critérios no README.
3. O webhook confirma, o projeto fica `active`, o squad fica `active` e o log ganha "Projeto
   iniciado".
4. Um squad tem no máximo um projeto `active` por vez.

### Teste de entrada

1. A página Preparação (Fundação) e a página Teste de entrada explicam o teste e apontam
   `he4rt/primeiro-commit`. Qualquer outro repositório da organização também vale.
2. O membro faz fork, commit e abre um PR com a conta GitHub vinculada.
3. O Hub detecta o PR pelo webhook, sem o membro colar link.
4. Qualquer pessoa da staff revisa, conversa nos comentários do PR e faz o merge no GitHub. O merge
   aprova o teste. Não há merge automático.
5. O Hub lista em **Testes de entrada** (admin) os PRs esperando revisão, do mais antigo para o mais
   novo, para nenhum ficar esquecido.

### Candidatura

1. O capitão define as perguntas da candidatura e os lugares do projeto.
2. O membro com teste aprovado se candidata respondendo às perguntas. Uma candidatura `pending` por
   projeto; ele pode desistir enquanto estiver `pending`.
3. Na aba **Candidaturas**, o capitão vê respostas, perfil, trajetória, o PR do teste e o histórico
   de squads, e anota pontos fortes e pontos de melhoria. O membro, o capitão e a administração veem
   as anotações.
4. **Aceitar** exige lugar livre. O App adiciona a pessoa ao time do squad (e convida à organização
   se ela ainda não for membro). A candidatura fica `accepted`; quando o convite é aceito, vira
   participação ativa, o log ganha "Entrou no squad" e dispara `squad_joined`.
5. **Recusar** exige dois campos: "por que agora não" e "o que fortalecer para a próxima". O membro
   recebe o retorno no Hub e pode se candidatar de novo.
6. Anotações e retorno passam pela moderação automática antes de serem salvos, porque o membro lê.

### Entregas

1. Um item chega em "Feito" no board. Se é técnico, precisa de pelo menos um PR merged ligado.
2. O Hub cria uma entrega `pending` com o crédito pré-preenchido: autor do PR, `Co-authored-by` dos
   commits, revisores e assignees, e o critério de aceite do item.
3. O capitão confere o critério e registra o que cada pessoa fez e se foi individual, em dupla ou em
   grupo. Aceita ou devolve com motivo.
4. A entrega aceita entra no log do squad e no histórico de cada creditado, chega privada ao perfil
   e dispara `delivery_accepted`.
5. O App abre um PR que atualiza a seção "Quem fez" do README. O mesmo dado alimenta a divulgação.
6. Entrega devolvida volta a `pending` quando o item muda de novo no board. Nada é apagado.

### Encerrar projeto e squad inativo

1. O capitão, o admin ou o super admin encerra o projeto. O log ganha "Projeto encerrado".
2. O repositório fica arquivado ou aberto a contribuições externas, à escolha de quem encerra.
3. Sem projeto ativo, o squad fica `inactive`. Squad nunca é apagado; log e histórico ficam.

### Ações do super admin

Trocar capitão, tirar membro e realocar membro para outro squad exigem motivo. Cada uma grava uma
entrada no log do squad com autor e motivo, e ajusta o time no GitHub. Nada do que a pessoa fez é
removido do log nem do histórico dela.

## Modelo de dados

Tipos do `src/mocks/db.ts`, espelhando as Data classes do Laravel. Datas em ISO 8601. O protótipo
do perfil público (thread "Conceito do perfil público", não commitado) já tem `Squad`,
`SquadProject`, `Delivery`, `ProjectParticipant` e `ProjectEvidence`; os tipos abaixo os estendem.

```ts
type UserRole = 'member' | 'admin' | 'super-admin' // staff = admin | super-admin

type Squad = {
  id: string
  slug: string
  name: string
  description: string
  captainId: string | null // null = vacancy
  status: 'active' | 'inactive'
  createdAt: string
}

type SquadProject = {
  id: string
  squadId: string
  slug: string
  name: string
  goal: string
  acceptanceCriteria: { id: string; text: string }[]
  evaluationCriteria: { id: string; competency: string; description: string }[]
  stack: string[]
  expectedLevel: StartingPoint[]
  seats: number
  applicationQuestions: { id: string; text: string; required: boolean }[]
  repository: { githubId: number; fullName: string; url: string } | null
  board: { number: number; url: string } | null
  status: 'provisioning' | 'active' | 'ended'
  startedAt: string | null
  endedAt: string | null
}

type SquadMembership = {
  id: string
  squadId: string
  projectId: string
  userId: string
  responsibilities: string
  shownOnProfile: boolean
  joinedAt: string
  leftAt: string | null
  leftReason: string | null
}

type EntryTest = {
  userId: string
  pullRequest: { repository: string; number: number; url: string; title: string }
  status: 'open' | 'approved' | 'closed'
  reviewer: string | null // GitHub login of the staff member who merged
  openedAt: string
  approvedAt: string | null
}

type SquadApplication = {
  id: string
  projectId: string
  userId: string
  answers: { questionId: string; answer: string }[]
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn'
  notes: { strengths: string; improvements: string; authorId: string; updatedAt: string } | null
  decision: { reason: string; nextSteps: string; decidedBy: string; decidedAt: string } | null
  githubInvite: 'not-needed' | 'pending' | 'accepted'
  createdAt: string
}

type BoardItem = {
  id: string
  projectId: string
  issue: { number: number; title: string; url: string } | null // null for draft items
  status: 'backlog' | 'ready' | 'in-progress' | 'in-review' | 'done'
  kind: 'technical' | 'non-technical'
  criterionId: string | null
  assigneeIds: string[]
  pullRequests: { number: number; url: string; merged: boolean }[]
  updatedAt: string
}

type Delivery = {
  id: string
  projectId: string
  boardItemId: string
  title: string
  kind: 'technical' | 'non-technical'
  criterionId: string | null
  status: 'pending' | 'accepted' | 'returned'
  collaboration: 'individual' | 'pair' | 'group'
  credits: { userId: string; part: string }[]
  context: string // captain's note, read by the validator
  evidence: { kind: 'commit' | 'pull-request' | 'review'; ref: string; url: string; authorId: string }[]
  returnedReason: string | null
  decidedBy: string | null
  decidedAt: string | null
  createdAt: string
}

type SquadLogEntry = {
  id: string
  squadId: string
  projectId: string | null
  kind:
    | 'project-started'
    | 'project-ended'
    | 'member-joined'
    | 'member-left'
    | 'member-removed'
    | 'member-reassigned'
    | 'captain-changed'
    | 'delivery-accepted'
  actorId: string
  subjectId: string | null
  reason: string | null
  at: string
}

type GithubSync = {
  lastWebhookAt: string | null
  lastSweepAt: string | null
  divergences: { id: string; description: string; detectedAt: string }[]
}
```

## Telas

### Páginas públicas (landing, sem login)

| Página | URL | Arquivo | Conteúdo |
| --- | --- | --- | --- |
| Squads | `/squads` | `landing/features/squads/squads/pages/index.tsx` | Ativos e inativos (filtro na URL), projeto atual, stack, capitão ou "vacancy", lugares abertos |
| Detalhe do squad | `/squads/:squad` | `.../squads/pages/show.tsx` | Objetivo e critérios do projeto atual, capitão, membros, log do squad, botão Candidatar-se |
| Projeto | `/squads/:squad/projects/:project` | `.../squads/projects/pages/show.tsx` | Objetivo, critérios, membros com o que cada um fez, entregas aceitas, link do repositório |

Se o perfil público mudar para dentro de `/app`, como no protótipo do perfil, estas páginas vão
junto. A URL do squad não muda depois de publicada.

### Membro (panel-app)

| Página | URL | Arquivo | Conteúdo e estados |
| --- | --- | --- | --- |
| Teste de entrada | `/app/squads/entry-test` | `panel-app/features/squads/entry-test/pages/show.tsx` | Instruções; estado: sem PR, PR aberto esperando a staff, aprovado, fechado sem merge (link para os comentários) |
| Candidatura | `/app/squads/:squad/projects/:project/applications/create` | `.../squads/squads/applications/pages/create.tsx` | Perguntas do capitão; bloqueada sem teste aprovado, sem lugar ou com candidatura pendente |
| Minhas candidaturas | `/app/squads/applications` | `.../squads/applications/pages/index.tsx` | Estado de cada uma, anotações do capitão, retorno da recusa, convite do GitHub pendente |
| Meu squad | `/app/squads/:squad` | `.../squads/squads/pages/show.tsx` | Board espelhado, minhas entregas, histórico "eu × time", Pedir validação, Sair do squad |

### Capitão (seções de Meu squad, visíveis só a ele e ao super admin)

| Seção | URL | Arquivo | Conteúdo |
| --- | --- | --- | --- |
| Candidaturas | `/app/squads/:squad/applications` | `.../squads/squads/applications/pages/index.tsx` | Lista por projeto; painel com perfil, respostas, PR do teste, anotações; Aceitar e Recusar |
| Perguntas e lugares | `/app/squads/:squad/projects/:project/edit` | `.../squads/squads/projects/pages/edit.tsx` | Perguntas da candidatura, lugares, encerrar projeto |
| Entregas para aceitar | `/app/squads/:squad/deliveries` | `.../squads/squads/deliveries/pages/index.tsx` | Pendentes, com critério, crédito pré-preenchido e evidências; Aceitar e Devolver |
| Membros | `/app/squads/:squad/members` | `.../squads/squads/members/pages/index.tsx` | Responsabilidades de cada um |

### Administração (panel-admin)

| Página | URL | Arquivo | Conteúdo |
| --- | --- | --- | --- |
| Squads | `/admin/squads` | `panel-admin/features/squads/squads/pages/index.tsx` | Todos os squads, estado, capitão, projeto atual, pendências do capitão |
| Novo squad | `/admin/squads/create` | `.../squads/squads/pages/create.tsx` | Nome, descrição, capitão opcional |
| Squad | `/admin/squads/:squad` | `.../squads/squads/pages/show.tsx` | Projetos, membros, log; ações de super admin com motivo |
| Novo projeto | `/admin/squads/:squad/projects/create` | `.../squads/squads/projects/pages/create.tsx` | Campos padronizados, criar ou vincular repositório |
| Testes de entrada | `/admin/squads/entry-tests` | `.../squads/entry-tests/pages/index.tsx` | PRs esperando revisão, mais antigos primeiro, com link para o GitHub |
| Integração GitHub | `/admin/system/github` | `.../system/github/pages/show.tsx` | App instalado, último webhook, última varredura, divergências, Sincronizar agora |

### Estados que toda tela cobre

Vazio, carregando (latência de 3000 ms), erro esperado (`MockError`) e muitos dados. Botões que
disparam ação ficam desabilitados enquanto ela roda e usam `<Button loading>`. Controles que a ação
recusaria ficam escondidos ou desabilitados lendo a mesma regra.

## Endpoints e ações

O nome da ação mockada é o nome da rota no Laravel. A função exportada mantém o nome de negócio.
Os slugs `applications` e `entry-test` são reservados e não podem ser slug de squad, porque dividem
o prefixo `/app/squads/` com `{squad}`.

### Páginas (GET)

| Rota | Nome |
| --- | --- |
| `GET /squads` | `landing.squads.index` |
| `GET /squads/{squad}` | `landing.squads.show` |
| `GET /squads/{squad}/projects/{project}` | `landing.squads.projects.show` |
| `GET /app/squads/entry-test` | `panel-app.squads.entry-test.show` |
| `GET /app/squads/applications` | `panel-app.squads.applications.index` |
| `GET /app/squads/{squad}` | `panel-app.squads.show` |
| `GET /app/squads/{squad}/applications` | `panel-app.squads.project-applications.index` |
| `GET /app/squads/{squad}/projects/{project}/applications/create` | `panel-app.squads.projects.applications.create` |
| `GET /app/squads/{squad}/projects/{project}/edit` | `panel-app.squads.projects.edit` |
| `GET /app/squads/{squad}/deliveries` | `panel-app.squads.deliveries.index` |
| `GET /app/squads/{squad}/members` | `panel-app.squads.members.index` |
| `GET /admin/squads` | `panel-admin.squads.index` |
| `GET /admin/squads/create` | `panel-admin.squads.create` |
| `GET /admin/squads/{squad}` | `panel-admin.squads.show` |
| `GET /admin/squads/{squad}/projects/create` | `panel-admin.squads.projects.create` |
| `GET /admin/squads/entry-tests` | `panel-admin.squads.entry-tests.index` |
| `GET /admin/system/github` | `panel-admin.system.github.show` |

### Escritas

| Rota | Ação mockada | Função | Quem | Checagens (na ação) |
| --- | --- | --- | --- | --- |
| `POST /app/squads/{squad}/projects/{project}/applications` | `panel-app.squads.projects.applications.store` | `applyToProject` | Membro | Teste aprovado; projeto ativo com lugar; sem candidatura pendente nem participação ativa no projeto; perguntas obrigatórias respondidas |
| `DELETE /app/squads/applications/{application}` | `panel-app.squads.applications.destroy` | `withdrawApplication` | Autor | Candidatura `pending` |
| `PUT /app/squads/{squad}/applications/{application}/notes` | `panel-app.squads.applications.notes.update` | `saveApplicationNotes` | Capitão, super admin | Candidatura do squad; moderação aprova o texto |
| `PATCH /app/squads/{squad}/applications/{application}` | `panel-app.squads.applications.update` | `acceptApplication`, `declineApplication` | Capitão, super admin | `pending`; aceitar exige lugar livre; recusar exige `reason` e `nextSteps` com pelo menos 30 caracteres cada e aprovados pela moderação |
| `PATCH /app/squads/{squad}/projects/{project}` | `panel-app.squads.projects.update` | `updateProjectSettings`, `endProject` | Capitão, staff | Lugares não abaixo dos membros ativos; encerrar exige projeto `active` |
| `PATCH /app/squads/{squad}/deliveries/{delivery}` | `panel-app.squads.deliveries.update` | `acceptDelivery`, `returnDelivery` | Capitão, super admin | `pending`; aceitar exige ao menos um crédito com `part` preenchido e `context`; técnica exige PR merged; capitão não aceita sozinho uma entrega creditada só a ele (vai ao super admin) |
| `PATCH /app/squads/{squad}/members/{membership}` | `panel-app.squads.members.update` | `updateResponsibilities` | Capitão, super admin | Participação ativa |
| `DELETE /app/squads/{squad}/members/{membership}` | `panel-app.squads.members.destroy` | `leaveSquad` | O próprio membro | Participação ativa; capitão precisa ser trocado antes |
| `POST /admin/squads` | `panel-admin.squads.store` | `createSquad` | Staff | Nome e slug únicos |
| `POST /admin/squads/{squad}/projects` | `panel-admin.squads.projects.store` | `createProject` | Staff | Squad sem projeto ativo; objetivo, ao menos um critério de aceite e um de avaliação; capitão com GitHub vinculado; repositório inexistente (criar) ou da organização (vincular) |
| `PATCH /admin/squads/{squad}/captain` | `panel-admin.squads.captain.update` | `changeCaptain` | Staff para alocar em vacancy; super admin para trocar | Motivo obrigatório ao trocar; novo capitão com GitHub vinculado |
| `DELETE /admin/squads/{squad}/members/{membership}` | `panel-admin.squads.members.destroy` | `removeMember` | Super admin | Motivo obrigatório |
| `PATCH /admin/squads/{squad}/members/{membership}` | `panel-admin.squads.members.update` | `reassignMember` | Super admin | Motivo; squad de destino com projeto ativo |
| `POST /admin/system/github/sync` | `panel-admin.system.github.sync.store` | `syncGithub` | Staff | |
| `POST /webhooks/github` | (sem ação mockada; simulado pelas ações de debug) | | GitHub | Assinatura válida; entrega idempotente |

## Eventos de medição

Já previstos no `PRODUCT_METRICS.md`: `squad_test_submitted` (PR do teste aberto), `squad_joined`
(convite aceito), `delivery_accepted`.

Novos, já no `PRODUCT_METRICS.md`:

| Evento | Quando dispara |
| --- | --- |
| `squad_test_approved` | PR do teste merged |
| `squad_application_submitted` | Candidatura enviada |
| `squad_application_decided` | Capitão aceita ou recusa (com `decision`) |
| `squad_project_created` | Projeto criado pelo admin |
| `delivery_returned` | Capitão devolve uma entrega |

## Ações de debug

| Página | Ações |
| --- | --- |
| Teste de entrada | Abrir PR do teste; Staff faz merge; Fechar PR sem merge |
| Squads e Detalhe | Criar 20 squads; Deixar todos inativos; Tirar o capitão (vacancy) |
| Candidatura | Preencher respostas válidas; Lotar os lugares (erro esperado); Esquecer o teste (erro esperado) |
| Minhas candidaturas | Capitão aceita; Capitão recusa com retorno; Convite do GitHub aceito |
| Candidaturas (capitão) | Gerar 30 candidaturas; Recusar sem retorno (erro esperado) |
| Meu squad | Item vai para Feito; Chegar webhook fora de ordem; GitHub fora do ar |
| Entregas para aceitar | Gerar 10 entregas pendentes; Aceitar sem crédito (erro esperado) |
| Admin Squads | Criar projeto com repositório existente (erro esperado); Provisionamento falha |
| Integração GitHub | Gerar divergência de acesso; Webhook atrasado 2 dias |

## Cenários (BDD)

```gherkin
# language: pt
Funcionalidade: Projeto de squad nasce no Hub

  Cenário: Admin cria um projeto e o GitHub é provisionado
    Dado que o squad "Loja Comunitária" não tem projeto ativo
    E que a staff "Marina" está no painel admin
    Quando ela cria o projeto "checkout" com objetivo, 3 critérios de aceite, 2 critérios de avaliação, 5 lugares e o capitão "Rafael"
    Então o projeto fica "provisioning"
    E o App cria "he4rt/loja-checkout" a partir de "he4rt/template-squad" com o objetivo e os critérios no README
    Quando o GitHub confirma o repositório e o board
    Então o projeto fica "active"
    E o log do squad registra "Projeto iniciado" por "Marina"

  Cenário: Projeto sem critério de aceite é recusado
    Quando a staff cria um projeto sem critério de aceite
    Então vê o erro "Inclua ao menos um critério de aceite"
    E nenhum repositório é criado

  Cenário: Squad com projeto ativo não recebe outro
    Dado que o squad "Loja Comunitária" tem o projeto "checkout" ativo
    Então o botão "Novo projeto" não aparece para o squad

Funcionalidade: Teste de entrada

  Cenário: PR aberto aguarda a staff
    Dado que "Ana" tem o GitHub vinculado e nenhum teste de entrada
    Quando ela abre um PR em "he4rt/primeiro-commit"
    Então a página Teste de entrada mostra "Esperando revisão da staff"
    E o PR aparece em Testes de entrada no admin
    E o evento "squad_test_submitted" é registrado

  Cenário: Merge da staff aprova o teste
    Dado que "Ana" tem um PR de teste aberto
    Quando qualquer pessoa da staff faz o merge no GitHub
    Então o teste de "Ana" fica aprovado
    E ela pode se candidatar a projetos

  Cenário: PR fechado sem merge
    Dado que "Ana" tem um PR de teste aberto
    Quando a staff fecha o PR sem merge
    Então a página Teste de entrada mostra o link para os comentários do PR
    E "Ana" pode abrir outro PR

Funcionalidade: Candidatura ao squad

  Cenário: Sem teste aprovado não há candidatura
    Dado que "Bruno" não tem teste de entrada aprovado
    Quando ele abre o detalhe do squad "Loja Comunitária"
    Então o botão "Candidatar-se" leva à página Teste de entrada

  Cenário: Capitão aceita e o acesso ao repositório é liberado
    Dado que "Ana" se candidatou ao projeto "checkout" e há lugar livre
    Quando o capitão "Rafael" aceita a candidatura
    Então o App adiciona "Ana" ao time "squad-loja-comunitaria"
    E a candidatura mostra "Convite do GitHub pendente"
    Quando "Ana" aceita o convite no GitHub
    Então ela aparece entre os membros do squad
    E o log do squad registra "Ana entrou no squad"

  Cenário: Recusa sem retorno não é enviada
    Dado que "Bruno" se candidatou ao projeto "checkout"
    Quando o capitão tenta recusar sem preencher "o que fortalecer para a próxima"
    Então o botão "Recusar" fica desabilitado
    E nenhum retorno chega a "Bruno"

  Cenário: Recusa com retorno chega ao membro
    Quando o capitão recusa "Bruno" com o motivo e o que fortalecer
    Então "Bruno" vê o motivo, o que fortalecer e as anotações em Minhas candidaturas
    E pode se candidatar de novo

  Cenário: Anotações do capitão são lidas pelo membro
    Dado que o capitão anotou pontos fortes e de melhoria na candidatura de "Ana"
    Então "Ana", o capitão e a administração veem as anotações
    E nenhum outro membro do squad as vê

  Cenário: Projeto lotado
    Dado que o projeto "checkout" tem 5 lugares e 5 membros ativos
    Então o botão "Aceitar" fica desabilitado com "Sem lugares livres"

Funcionalidade: Entregas

  Cenário: Item em Feito vira entrega pendente com crédito pré-preenchido
    Dado que o PR #34 de "Ana", com "Co-authored-by: Rafael", foi merged e está ligado à issue #12
    Quando a issue #12 vai para "Feito" no board
    Então o capitão vê a entrega pendente "Frete por CEP" com crédito para "Ana" e "Rafael"

  Cenário: Capitão aceita registrando quem fez o quê
    Quando o capitão aceita a entrega com "Ana: cálculo e testes", "Rafael: pareamento" e o contexto
    Então a entrega entra no log do squad e no histórico de "Ana" e de "Rafael"
    E o App abre um PR atualizando "Quem fez" no README
    E o evento "delivery_accepted" é registrado

  Cenário: Entrega técnica sem PR merged
    Dado que um item técnico foi para "Feito" sem PR merged
    Então nenhuma entrega pendente é criada

  Cenário: Webhook perdido
    Dado que o GitHub não entregou o webhook do item que foi para "Feito"
    Quando a varredura periódica roda
    Então a entrega pendente é criada

Funcionalidade: Squad nunca é apagado

  Cenário: Encerrar o único projeto deixa o squad inativo
    Quando o capitão encerra o projeto "checkout"
    Então o squad "Loja Comunitária" fica inativo
    E o log e o histórico dos membros continuam visíveis

  Cenário: Super admin tira um membro
    Quando o super admin tira "Bruno" do squad com o motivo "inativo há 2 meses"
    Então o log registra a saída com autor e motivo
    E as entregas aceitas de "Bruno" continuam no log e no histórico dele
```
