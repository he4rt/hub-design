# Validação

Spec da etapa 2 do `PRODUCT.md` (Squads e validação), parte de validação. Squads, entregas e a
integração com o GitHub estão em [`squads.md`](./squads.md). Este é o "documento complementar de
validação" que o `PRODUCT.md` cita.

## Resumo

- O validador é alguém já no mercado, habilitado pela administração a partir de prova técnica. A
  validação funciona como uma recomendação indireta, parecida com a do LinkedIn, que o membro usa
  como portfólio.
- O membro pede validação de entregas aceitas, para uma competência entre os critérios de avaliação
  do projeto. O pedido entra numa fila única e é distribuído automaticamente a um validador de fora
  do squad, com até 3 validações abertas por validador.
- A validação traz contexto, contribuição, pontos fortes e pontos de melhoria, cada um citando a
  evidência, e conflito de interesse declarado. Pode registrar evidência insuficiente. É imutável.
- Chega privada. O membro escolhe quais validações publicar, uma a uma, e cada uma é publicada
  inteira. Cargo e empresa do validador aparecem quando ele libera.

## Decisões

| Tema | Decisão | Origem |
| --- | --- | --- |
| Quem valida | Pessoa já no mercado; a validação tem peso de recomendação | Daniel, rodada 1 |
| Cargo e empresa do validador | Aparecem na validação publicada quando o validador libera | Daniel, rodada 2 |
| Positivas e construtivas | As duas ficam no portfólio; um portfólio só de elogios perde credibilidade | Daniel, rodada 2 |
| Publicação | O membro escolhe quais validações mostrar; cada uma sempre inteira | Daniel, rodada 3 e thread do perfil público |
| Contestação | Aberta pelo membro que recebeu a validação ou pela administração; decidida por alguém de fora do caso | Thread do perfil público |
| Grupo de código | `validation` | Daniel, rodada 2 |

### Suposições que o Daniel pode vetar

- As 5 primeiras validações de cada validador passam por revisão de um admin antes do registro, como
  proposto na thread do perfil público. Validação em revisão ocupa uma das 3 vagas do validador.
- O validador pode ter sido membro de outros squads; só não valida pedidos do squad em que está ou
  esteve no mesmo projeto, nem quando é o capitão.
- Um pedido fica atribuído até ser registrado. Se o validador não registra em 21 dias, a staff vê o
  pedido como parado e pode redistribuir; o Hub não promete prazo ao membro.
- Um membro tem no máximo 3 pedidos abertos ao mesmo tempo, para a fila não ser tomada por poucos.

## Regras do `PRODUCT.md` que esta spec mantém

- Validação não é certificado, nota, aprovação nem selo. A interface nunca usa essas palavras.
- O capitão não valida o próprio squad; o contexto dele vem das entregas aceitas.
- A validação é da pessoa, não do squad.
- Privada por padrão; só aparece no perfil público quando o membro publica.
- Quem valida não ganha com a contratação de quem validou.
- Validador habilitado pela administração; a recusa não é permanente.
- Janela de 3 validações abertas por validador e fila única com distribuição automática.
- Imutável; correção ou contestação por novo registro que não oculta o anterior.
- O que a plataforma apura, o membro não edita.

## Fluxos

### Habilitação de validador

1. Em **Quero validar**, o membro envia a prova técnica: resumo da experiência, currículo, links
   (perfis, contribuições, certificações), arquivos, cargo e empresa atuais, e se cargo e empresa
   aparecem nas validações.
2. A staff analisa em **Validadores** e aprova ou recusa com retorno construtivo.
3. Recusado pode pedir de novo quando quiser; o pedido anterior fica no histórico dele.
4. Aprovado vira validador e entra na distribuição. O validador pode mudar cargo, empresa e a
   preferência de exibição depois; cada validação guarda os valores do momento do registro.
5. O super admin pode suspender um validador com motivo. Suspenso não recebe pedidos novos; os que
   estavam com ele voltam para a frente da fila.

### Pedido de validação

1. Em Meu squad, o membro escolhe uma ou mais entregas aceitas em que tem crédito e uma competência
   entre os critérios de avaliação do projeto.
2. O pedido entra na fila com estado `queued` e dispara `validation_requested`.
3. O membro pode cancelar enquanto o pedido estiver `queued`.

### Distribuição

O pedido mais antigo da fila vai para o primeiro validador elegível. Elegível é quem:

- está habilitado e não suspenso;
- tem menos de 3 validações abertas (`assigned` ou em revisão);
- não é o membro que pediu;
- não é capitão nem membro do squad do projeto das entregas;
- não declarou conflito com esse membro antes.

Entre os elegíveis, recebe quem está há mais tempo sem receber um pedido. A distribuição roda quando
um pedido entra, quando uma validação é registrada, quando um validador é habilitado e quando um
conflito é declarado. Ela dispara `validation_assigned`.

### Conflito declarado

1. O validador vê o pedido e declara conflito com uma descrição (privada, só a staff vê).
2. O pedido volta para a frente da fila e não vai mais para esse validador.
3. Conflito declarado depois de começar a escrever descarta o rascunho.

### Registro

1. O validador vê o objetivo e os critérios do projeto, as entregas com os PRs, o crédito e o
   contexto do capitão.
2. Preenche: contexto, contribuição observada, pontos fortes, pontos de melhoria (cada um com a
   evidência que cita e uma sugestão do que fazer) e a declaração de conflito de interesse ("não
   tenho conflito" ou a descrição do conflito que não impede a validação).
3. Pode marcar **evidência insuficiente**. Mesmo assim registra o que viu e o que faltou como ponto
   de melhoria.
4. A moderação automática sinaliza linguagem pessoal ou ofensiva e devolve ao validador.
5. Se o validador está nas 5 primeiras, a validação fica `in-review` até um admin aprovar ou
   devolver com nota. Devolvida, volta a rascunho com o validador.
6. Registrada, fica imutável, chega privada ao membro e dispara `validation_recorded`.

### Publicação

1. Em Minhas validações, o membro publica ou despublica cada validação quando quiser.
2. Publicada aparece inteira no perfil público: competência, projeto, contexto, contribuição, pontos
   fortes, pontos de melhoria, nome do validador e, se ele liberou, cargo e empresa.
3. Publicar só tem efeito com o perfil público ligado. Dispara `validation_published`.

### Contestação

1. O membro que recebeu, ou a staff, abre a contestação com motivo.
2. Um super admin que não é o validador nem o membro decide: mantida ou corrigida.
3. Corrigida gera uma nova validação, registrada pelo mesmo validador ou por outro, que aponta para a
   anterior (`supersedesId`). O perfil mostra a mais recente com "ver registro anterior".
4. Enquanto aberta, uma validação publicada mostra "revisão em andamento", e o membro pode
   despublicar.

## Modelo de dados

```ts
type ValidatorApplication = {
  id: string
  userId: string
  summary: string
  links: string[]
  files: { name: string; url: string }[]
  jobTitle: string
  company: string
  showEmployer: boolean
  status: 'pending' | 'approved' | 'declined'
  decision: { reason: string; decidedBy: string; decidedAt: string } | null
  createdAt: string
}

type Validator = {
  userId: string
  approvedAt: string
  jobTitle: string
  company: string
  showEmployer: boolean
  suspension: { reason: string; by: string; at: string } | null
  lastAssignedAt: string | null
}

type ValidationRequest = {
  id: string
  memberId: string
  projectId: string
  deliveryIds: string[]
  criterionId: string // SquadProject.evaluationCriteria id
  status: 'queued' | 'assigned' | 'recorded' | 'cancelled'
  validatorId: string | null
  assignedAt: string | null
  conflicts: { validatorId: string; description: string; at: string }[]
  createdAt: string
}

type Validation = {
  id: string
  requestId: string
  memberId: string
  validatorId: string
  validator: { name: string; jobTitle: string | null; company: string | null } // snapshot at record time
  competency: string
  context: string
  contribution: string
  strengths: { text: string; evidenceRef: string }[]
  improvements: { text: string; evidenceRef: string; suggestion: string }[]
  conflictOfInterest: { declared: boolean; description: string }
  insufficientEvidence: boolean
  status: 'draft' | 'in-review' | 'recorded'
  review: { reviewerId: string; decision: 'approved' | 'returned'; note: string; at: string } | null
  recordedAt: string | null
  published: boolean
  publishedAt: string | null
  supersedesId: string | null
}

type Contestation = {
  id: string
  validationId: string
  openedBy: string
  reason: string
  status: 'open' | 'upheld' | 'corrected'
  decision: { by: string; note: string; at: string } | null
  correctionId: string | null
  createdAt: string
}
```

## Telas

### Membro e validador (panel-app)

| Página | URL | Arquivo | Conteúdo e estados |
| --- | --- | --- | --- |
| Pedir validação | `/app/validation/requests/create?squad=:squad` | `panel-app/features/validation/requests/pages/create.tsx` | Entregas aceitas do membro, competência; bloqueado com 3 pedidos abertos ou sem entrega aceita |
| Minhas validações | `/app/validation` | `.../validation/validations/pages/index.tsx` | Pedidos (na fila, com validador), validações recebidas, Publicar/Despublicar, Contestar |
| Validação | `/app/validation/:validation` | `.../validation/validations/pages/show.tsx` | A validação inteira, registros anteriores, estado da contestação |
| Quero validar | `/app/validation/validator-application` | `.../validation/validator-application/pages/show.tsx` | Formulário, estado do pedido, retorno da recusa, pedir de novo |
| Fila do validador | `/app/validation/queue` | `.../validation/queue/pages/index.tsx` | Até 3 abertas, com prazo decorrido (sem meta), Declarar conflito |
| Registrar validação | `/app/validation/queue/:request` | `.../validation/queue/pages/show.tsx` | Evidências e critérios ao lado do formulário; estados rascunho, em revisão, devolvida |

### Administração (panel-admin)

| Página | URL | Arquivo | Conteúdo |
| --- | --- | --- | --- |
| Validadores | `/admin/validation/validators` | `panel-admin/features/validation/validators/pages/index.tsx` | Habilitados, ocupação de cada um (abertas/3), suspender |
| Pedidos de habilitação | `/admin/validation/validator-applications` | `.../validation/validators/pages/applications.tsx` | Prova técnica, Aprovar, Recusar com retorno |
| Fila de validação | `/admin/validation/queue` | `.../validation/queue/pages/index.tsx` | Fila, ocupação total, pedidos parados, Redistribuir |
| Revisões | `/admin/validation/reviews` | `.../validation/reviews/pages/index.tsx` | Validações `in-review`, Aprovar, Devolver com nota |
| Contestações | `/admin/validation/contestations` | `.../validation/contestations/pages/index.tsx` | Abertas, Manter, Corrigir |

### Perfil público

O perfil público ganha o bloco "Validações", só com as publicadas, sem espaço vazio quando não há
nenhuma. Cada uma aparece inteira.

## Endpoints e ações

### Páginas (GET)

| Rota | Nome |
| --- | --- |
| `GET /app/validation` | `panel-app.validations.index` |
| `GET /app/validation/{validation}` | `panel-app.validations.show` |
| `GET /app/validation/requests/create` | `panel-app.validation-requests.create` |
| `GET /app/validation/validator-application` | `panel-app.validator-application.show` |
| `GET /app/validation/queue` | `panel-app.validation-queue.index` |
| `GET /app/validation/queue/{request}` | `panel-app.validation-queue.show` |
| `GET /admin/validation/validators` | `panel-admin.validators.index` |
| `GET /admin/validation/validator-applications` | `panel-admin.validator-applications.index` |
| `GET /admin/validation/queue` | `panel-admin.validation-requests.index` |
| `GET /admin/validation/reviews` | `panel-admin.validation-reviews.index` |
| `GET /admin/validation/contestations` | `panel-admin.contestations.index` |

### Escritas

| Rota | Ação mockada | Função | Quem | Checagens (na ação) |
| --- | --- | --- | --- | --- |
| `POST /app/validation/requests` | `panel-app.validation-requests.store` | `requestValidation` | Membro | Entregas aceitas com crédito do membro, do mesmo projeto; critério do projeto; menos de 3 pedidos abertos |
| `DELETE /app/validation/requests/{request}` | `panel-app.validation-requests.destroy` | `cancelValidationRequest` | Autor | Pedido `queued` |
| `POST /app/validation/queue/{request}/conflicts` | `panel-app.validation-requests.conflicts.store` | `declareConflict` | Validador atribuído | Pedido `assigned` a ele; descrição preenchida |
| `PUT /app/validation/queue/{request}/validation` | `panel-app.validation-requests.validation.update` | `saveValidationDraft` | Validador atribuído | Pedido `assigned` a ele |
| `POST /app/validation/queue/{request}/validation` | `panel-app.validation-requests.validation.store` | `recordValidation` | Validador atribuído | Contexto, contribuição, ao menos um ponto forte e um de melhoria com evidência, conflito declarado; moderação aprova |
| `POST /app/validation/{validation}/publication` | `panel-app.validations.publication.store` | `publishValidation` | Membro dono | Validação `recorded`; perfil público ligado |
| `DELETE /app/validation/{validation}/publication` | `panel-app.validations.publication.destroy` | `unpublishValidation` | Membro dono | Publicada |
| `POST /app/validation/{validation}/contestations` | `panel-app.validations.contestations.store` | `contestValidation` | Membro dono | `recorded`; sem contestação aberta; motivo preenchido |
| `POST /app/validation/validator-application` | `panel-app.validator-applications.store` | `applyAsValidator` | Membro | Sem pedido `pending`; não é validador; resumo e ao menos um link ou arquivo |
| `PATCH /app/validation/validator-profile` | `panel-app.validator-profile.update` | `updateValidatorProfile` | Validador | Cargo e empresa preenchidos |
| `PATCH /admin/validation/validator-applications/{application}` | `panel-admin.validator-applications.update` | `approveValidator`, `declineValidator` | Staff | `pending`; recusa exige retorno |
| `PATCH /admin/validation/validators/{validator}` | `panel-admin.validators.update` | `suspendValidator`, `reinstateValidator` | Super admin | Motivo ao suspender |
| `PATCH /admin/validation/queue/{request}` | `panel-admin.validation-requests.update` | `reassignValidationRequest` | Staff | Pedido `assigned`; novo validador elegível |
| `PATCH /admin/validation/reviews/{validation}` | `panel-admin.validation-reviews.update` | `approveValidationReview`, `returnValidationReview` | Staff | `in-review`; revisor não é o validador nem o membro; devolver exige nota |
| `POST /admin/validation/contestations` | `panel-admin.contestations.store` | `openContestation` | Staff | Igual à do membro |
| `PATCH /admin/validation/contestations/{contestation}` | `panel-admin.contestations.update` | `upholdValidation`, `correctValidation` | Super admin | Contestação aberta; quem decide não é o validador nem o membro |

## Eventos de medição

Já previstos no `PRODUCT_METRICS.md`: `validation_requested`, `validation_assigned`,
`validation_recorded`, `validation_published`.

Novos, já no `PRODUCT_METRICS.md`:

| Evento | Quando dispara |
| --- | --- |
| `validator_application_submitted` | Pedido de habilitação enviado |
| `validator_application_decided` | Staff aprova ou recusa |
| `validation_conflict_declared` | Validador devolve por conflito |
| `validation_review_decided` | Admin aprova ou devolve uma validação em revisão |
| `validation_unpublished` | Membro despublica |
| `validation_contested` | Contestação aberta |

As métricas de operação (ocupação, fila, tempo até validação, evidência insuficiente) já estão no
`PRODUCT_METRICS.md` e saem destes dados.

## Ações de debug

| Página | Ações |
| --- | --- |
| Pedir validação | Preencher pedido válido; Pedir com 3 abertos (erro esperado) |
| Minhas validações | Receber validação positiva; Receber validação com evidência insuficiente; Gerar 20 validações; Desligar perfil público |
| Quero validar | Preencher prova técnica; Staff aprova; Staff recusa com retorno |
| Fila do validador | Lotar a janela (3 abertas); Esvaziar a fila; Receber pedido de membro com conflito |
| Registrar validação | Preencher válida; Ponto de melhoria sem evidência (erro esperado); Texto ofensivo (moderação) |
| Admin Fila | Gerar 50 pedidos; Sem validadores habilitados; Pedido parado há 30 dias |

## Cenários (BDD)

```gherkin
# language: pt
Funcionalidade: Habilitação de validador

  Cenário: Recusa com retorno e novo pedido
    Dado que "Carla" enviou o pedido de habilitação com resumo e dois links
    Quando a staff recusa com o retorno "Mostre contribuições em revisão de código"
    Então "Carla" vê o retorno em Quero validar
    E pode enviar um novo pedido

  Cenário: Cargo e empresa só aparecem quando liberados
    Dado que o validador "Diego" é engenheiro na empresa X e não liberou a exibição
    Quando ele registra uma validação para "Ana"
    E "Ana" publica essa validação
    Então o perfil público mostra o nome de "Diego" sem cargo nem empresa

Funcionalidade: Fila única e janela de 3

  Cenário: Validador com janela cheia não recebe pedido
    Dado que o único validador elegível "Diego" tem 3 validações abertas
    Quando "Ana" pede validação da entrega "Frete por CEP"
    Então o pedido fica "na fila"
    E "Ana" não vê nenhum prazo prometido

  Cenário: Registro libera espaço e puxa o pedido mais antigo
    Dado que "Diego" tem 3 validações abertas e a fila tem os pedidos de "Ana" e depois de "Bruno"
    Quando "Diego" registra uma validação
    Então o pedido de "Ana" vai para "Diego"
    E o pedido de "Bruno" continua na fila

  Cenário: Validador do mesmo squad nunca recebe o pedido
    Dado que "Rafael" é validador e capitão do squad "Loja Comunitária"
    Quando "Ana", membro desse squad, pede validação
    Então o pedido não vai para "Rafael"

  Cenário: Conflito devolve o pedido para a frente da fila
    Dado que o pedido de "Ana" foi para "Diego"
    Quando "Diego" declara conflito por ter trabalhado com "Ana"
    Então o pedido volta para a frente da fila
    E nenhum pedido futuro de "Ana" vai para "Diego"

Funcionalidade: Registro da validação

  Cenário: Ponto de melhoria sem evidência é recusado
    Quando "Diego" registra um ponto de melhoria sem citar evidência
    Então vê o erro "Cite a evidência deste ponto"
    E a validação não é registrada

  Cenário: Evidência insuficiente
    Quando "Diego" marca evidência insuficiente e descreve o que faltou
    Então a validação é registrada como evidência insuficiente
    E chega privada a "Ana"

  Cenário: Validador novo passa por revisão
    Dado que "Carla" foi habilitada e ainda não registrou validações
    Quando ela envia a primeira validação
    Então a validação fica "em revisão" e ocupa uma das 3 vagas de "Carla"
    Quando um admin aprova
    Então a validação é registrada e chega a "Ana"

  Cenário: Validação registrada não muda
    Dado que a validação de "Ana" foi registrada
    Então ninguém consegue editá-la, nem "Diego" nem a staff

Funcionalidade: Publicação

  Cenário: Membro escolhe quais validações mostrar
    Dado que "Ana" tem uma validação positiva e uma com pontos de melhoria fortes
    Quando ela publica só a primeira
    Então o perfil público mostra só a primeira, inteira, com pontos fortes e de melhoria

  Cenário: Perfil público desligado
    Dado que o perfil público de "Ana" está desligado
    Então o botão "Publicar" fica desabilitado com "Ligue o perfil público para publicar"

Funcionalidade: Contestação

  Cenário: Correção não oculta o registro anterior
    Dado que "Ana" contestou uma validação publicada
    Então a validação mostra "revisão em andamento" no perfil
    Quando um super admin de fora do caso decide corrigir
    E uma nova validação é registrada
    Então o perfil mostra a nova com o link "ver registro anterior"
```
