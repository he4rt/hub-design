# Conquistas: spec

Reconhecimento no perfil do membro. Este documento lista todas as conquistas, os estágios da jornada e as
regras de exibição. Como cada conquista é apurada está em [`validation.md`](./validation.md), e os tipos do
mock estão em [`entities.md`](./entities.md).

Origem: o plano [Conquistas e acesso à área de vagas](https://ampcode.com/artifacts/conquistas-e-acesso-a-area-de-vagas-plano-de-gamificacao-fbeacc3c-dc4d-4dde-9f0b-de29fde081ef),
aprovado pelo Daniel em 18/11/2026 ("gostei de todos os achievements"). Fontes: `PRODUCT.md`,
`PRODUCT_METRICS.md`, `docs/squads.md` e `docs/validation.md` (da thread de squads) e as threads do perfil
público, do Feed e da autenticação.

## Princípios

- **Reconhecimento, não acesso.** Conquista e XP aparecem no perfil e nunca liberam nada. O acesso à área de
  vagas sai de uma checklist de evidência, que ainda espera decisão (ver "Acesso à área de vagas").
- **Apurada pela plataforma.** O membro não pede, não edita e não apaga. Só a administração concede as
  conquistas manuais, sempre com motivo.
- **Privada por padrão.** O membro escolhe quais aparecem no perfil público. Uma conquista ligada a algo
  privado (validação, entrega, recusa) só aparece quando o registro de origem está publicado.
- **Sem comparação.** Nada de contagem pública, ranking, raridade ("3% dos membros têm") ou nível numérico.
- **Visão comunidade.** No perfil, as conquistas ficam numa seção própria, fora da trajetória, e nunca vão
  para empresas junto de uma candidatura.

## Estágios da jornada

Substituem os níveis por XP. Mostram a evidência mais forte que o membro já teve, não o quanto ele é ativo
agora. Nunca caem.

| Ordem | Estágio | Como chega | Evento |
| --- | --- | --- | --- |
| 1 | Membro | Concluiu as perguntas do cadastro | `onboarding_completed` |
| 2 | Preparado | Teste de entrada aprovado | `squad_test_approved` |
| 3 | Praticante | Entrou num squad | `squad_joined` |
| 4 | Com entrega | Primeira entrega aceita | `delivery_accepted` |
| 5 | Validado | Primeira validação registrada | `validation_recorded` |

**Contribuidor** é paralelo aos cinco: atuou como capitão, validador ou revisor do teste de entrada. Aparece
ao lado do estágio, nunca no lugar dele.

- O estágio "Validado" segue a mesma regra de privacidade da validação: no perfil público, o estágio mostrado
  é o mais alto que o membro tem **publicado**. Sem validação publicada, o visitante vê "Com entrega".
- Na interface, o estágio fala de evidência no Hub, nunca de senioridade de mercado.

## Catálogo

**Legenda**

- **Chave:** identificador estável, usado no mock e nos eventos.
- **Etapa:** F (Fundação), 2 (Squads e validação), 3 (Vagas), M (manual), D (depois, depende de recurso que
  ainda não existe).
- **Acesso:** Piso (conta para o mural pela regra atual ou pela opção B), Vaga (pode ser requisito de uma
  vaga), Decisão (só conta se o critério mudar), Não. Hoje **nenhuma conquista libera acesso**: a coluna
  registra o marco que a checklist de acesso repete.
- **Privada:** a conquista segue a visibilidade do registro de origem.
- Eventos com `*` ainda não existem e precisam ser definidos antes de construir (princípio 10).

### 1. Chegada e identidade (`arrival`)

| # | Chave | Conquista | Como desbloqueia | Evento | Etapa | Acesso | Privada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `git-init` | `git init` | Concluiu as perguntas do cadastro | `onboarding_completed` | F | Não |  |
| 2 | `profile-complete` | Perfil completo | Completude chegou a 100% pela primeira vez | `profile_completed` | F | Não |  |
| 3 | `remote-added` | Remote adicionado | Vinculou o GitHub | `account_linked` | F | Não |  |
| 4 | `accounts-in-order` | Contas em ordem | Vinculou GitHub e LinkedIn | `account_linked` | F | Não |  |
| 5 | `email-verified` | E-mail confirmado | Confirmou o e-mail | `email_verified*` | F | Não |  |
| 6 | `page-live` | Página no ar | Publicou o perfil pela primeira vez | `profile_published` | F | Não |  |
| 7 | `about-me` | Sobre mim | Escreveu o "Sobre" e ele passou pela moderação | `profile_about_saved*` | F | Não |  |
| 8 | `living-resume` | Currículo vivo | Copiou o link do perfil público pela primeira vez | `profile_link_copied*` | F | Não |  |
| 9 | `objective-set` | Objetivo definido | Escolheu o objetivo e pelo menos uma área | `onboarding_step_completed` | F | Não |  |

### 2. Trajetória (`trajectory`)

| # | Chave | Conquista | Como desbloqueia | Evento | Etapa | Acesso | Privada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | `first-record` | Primeiro commit da trajetória | Primeiro registro de qualquer tipo | `trajectory_record_added` | F | Não |  |
| 11 | `studying` | Estudando | Primeira aprendizagem registrada | `trajectory_record_added` | F | Não | Sim |
| 12 | `basement-student` | Aluno da Basement | Primeiro curso concluído na Basement | `trajectory_record_added` (origem Basement) | F | Não | Sim |
| 13 | `experience-logged` | Experiência no log | Primeira experiência registrada | `trajectory_record_added` | F | Não |  |
| 14 | `author` | Autor | Primeiro artigo externo na trajetória | `trajectory_record_added` | F | Não |  |
| 15 | `with-proof` | Com prova | Primeira evidência técnica ligada a um registro | `trajectory_record_added` | F | Não |  |
| 16 | `course-to-squad` | Do curso ao squad | Curso da Basement e entrega aceita na mesma competência | Derivado | 2 | Vaga | Sim |
| 17 | `full-strength` | Força máxima | Uma competência declarada, registrada, demonstrada e validada | Derivado | 2 | Vaga | Sim |
| 18 | `five-records` | Os cinco registros | Tem os cinco tipos de registro da trajetória | Derivado | 2 | Não | Sim |
| 19 | `three-fronts` | Em três frentes | Evidência em 3 competências diferentes | Derivado | 2 | Vaga |  |
| 20 | `positive-diff` | Diff positivo | Uma competência subiu de força | Derivado | 2 | Não |  |
| 21 | `three-months-trajectory` | Três meses de trajetória | Registros em 3 meses diferentes, não precisam ser seguidos | Derivado | F | Decisão |  |
| 22 | `one-year-trajectory` | Um ano de trajetória | Primeiro e último registro com 12 meses de distância | Derivado | F | Decisão |  |
| 23 | `release-tag` | Tag de release | Marcou um ponto da trajetória como marco | `trajectory_milestone_tagged*` | D | Não |  |

### 3. Diário (`diary`)

Nenhuma conta para o acesso: publicar é participação, não competência.

| # | Chave | Conquista | Como desbloqueia | Evento | Etapa | Acesso | Privada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | `dear-diary` | Querido diário | Primeira publicação | `feed_post_created` | F | Não |  |
| 25 | `shared-learning` | Compartilhou o que aprendeu | Primeira publicação compartilhada no Feed | `feed_post_created` | F | Não |  |
| 26 | `on-display` | Na vitrine | Primeira publicação mostrada no perfil público | `feed_post_visibility_changed` | F | Não |  |
| 27 | `linked-to-trajectory` | Ligado à trajetória | Publicação ligada a um registro de aprendizagem | `feed_post_created` | F | Não |  |
| 28 | `after-class` | Depois da aula | Publicação ligada a um curso da Basement | `feed_post_created` | F | Não |  |
| 29 | `applied-in-squad` | Aplicado no squad | Publicação ligada a uma entrega aceita | `feed_post_created` | 2 | Não |  |
| 30 | `seven-posts` | Sete publicações | 7 publicações (exemplo do Daniel) | `feed_post_created` | F | Não |  |
| 31 | `seven-weeks-diary` | Sete semanas de diário | Publicou em 7 semanas diferentes | Derivado | F | Não |  |
| 32 | `six-months-diary` | Seis meses de diário | Publicou em 6 meses diferentes | Derivado | F | Não |  |
| 33 | `what-i-dont-know` | O que ainda não sei | Publicação com o campo "o que ainda não sei" | `feed_post_created` | D | Não |  |

A 30 premia volume. Ela entra, mas o perfil nunca mostra quantas publicações o membro tem.

### 4. Preparação e teste de entrada (`entry-test`)

| # | Chave | Conquista | Como desbloqueia | Evento | Etapa | Acesso | Privada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 34 | `pr-opened` | Pull request aberto | Abriu o PR do teste de entrada | `squad_test_submitted` | 2 | Não |  |
| 35 | `merged` | Merged | Teste de entrada aprovado | `squad_test_approved` | 2 | Piso |  |
| 36 | `second-try` | Segunda tentativa | Teste aprovado depois de um PR fechado sem merge | `squad_test_approved` | 2 | Não | Sim |
| 37 | `he4rt-open-source` | Open source He4rt | PR merged na organização, fora do teste e de squad | `org_pr_merged*` | 2 | Decisão |  |
| 38 | `maintainer` | Mantenedor | Permissão de manutenção num repositório da organização | Manual ou `membership` | M | Não |  |

### 5. Squads (`squads`)

| # | Chave | Conquista | Como desbloqueia | Evento | Etapa | Acesso | Privada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 39 | `applicant` | Candidato | Primeira candidatura a um squad | `squad_application_submitted` | 2 | Não | Sim |
| 40 | `came-back-stronger` | Voltei mais forte | Aceito num squad depois de ter sido recusado | `squad_application_decided` | 2 | Não | Sim |
| 41 | `in-squad` | No squad | Entrou no primeiro squad | `squad_joined` | 2 | Piso |  |
| 42 | `first-delivery` | Primeira entrega | Primeira entrega aceita | `delivery_accepted` | 2 | Piso |  |
| 43 | `technical-delivery` | Entrega técnica | Entrega aceita do tipo Técnica | `delivery_accepted` | 2 | Vaga |  |
| 44 | `beyond-code` | Além do código | Entrega aceita do tipo Não técnica | `delivery_accepted` | 2 | Vaga |  |
| 45 | `solo` | Solo | Entrega aceita com crédito individual | `delivery_accepted` | 2 | Vaga |  |
| 46 | `pair-programming` | Pair programming | Entrega aceita em dupla | `delivery_accepted` | 2 | Não |  |
| 47 | `team-work` | Em time | Entrega aceita em grupo | `delivery_accepted` | 2 | Não |  |
| 48 | `code-review` | Code review creditado | Revisor creditado numa entrega aceita | `delivery_accepted` | 2 | Vaga |  |
| 49 | `returned-and-accepted` | Devolvida e aceita | Entrega devolvida que depois foi aceita | `delivery_returned`, `delivery_accepted` | 2 | Não | Sim |
| 50 | `readme-credit` | Nome no README | PR de créditos com o nome do membro merged | `readme_credit_merged*` | 2 | Não |  |
| 51 | `criteria-met` | Critérios cumpridos | Entregas em 3 critérios de aceite do mesmo projeto | Derivado | 2 | Vaga |  |
| 52 | `project-shipped` | Projeto entregue | Creditado num projeto encerrado, com entrega própria | `squad_project_closed*` | 2 | Vaga |  |
| 53 | `start-to-finish` | Do início ao fim | No squad quando o projeto começou e quando terminou | Derivado | 2 | Vaga |  |
| 54 | `second-project` | Segundo projeto | Entregas aceitas em 2 projetos | Derivado | 2 | Vaga |  |
| 55 | `two-stacks` | Duas stacks | Entregas aceitas em projetos de stacks diferentes | Derivado | 2 | Vaga |  |
| 56 | `thirty-days-squad` | Trinta dias de squad | 30 dias entre a entrada e a última entrega aceita | Derivado | 2 | Piso |  |
| 57 | `three-months-squad` | Três meses de squad | Entregas em 3 meses diferentes do mesmo squad | Derivado | 2 | Vaga |  |
| 58 | `six-months-practice` | Seis meses de prática | Entregas em 6 meses diferentes, em qualquer squad | Derivado | 2 | Vaga |  |
| 59 | `first-week` | Primeira semana | Primeira entrega até 14 dias depois de entrar | Derivado | 2 | Não |  |

### 6. Validação recebida (`validation`)

Todas privadas: só aparecem com a validação de origem publicada.

| # | Chave | Conquista | Como desbloqueia | Evento | Etapa | Acesso | Privada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 60 | `asked-validation` | Pedi validação | Primeiro pedido de validação | `validation_requested` | 2 | Não | Sim |
| 61 | `validated` | Validado | Primeira validação registrada | `validation_recorded` | 2 | Piso | Sim |
| 62 | `open-portfolio` | Portfólio aberto | Primeira validação publicada | `validation_published` | 2 | Não | Sim |
| 63 | `two-competencies` | Duas competências | Validações em 2 competências | `validation_recorded` | 2 | Vaga | Sim |
| 64 | `two-perspectives` | Dois olhares | Validações de 2 validadores | `validation_recorded` | 2 | Vaga | Sim |
| 65 | `reinforced-evidence` | Evidência reforçada | Validação completa depois de uma com evidência insuficiente, na mesma competência | `validation_recorded` | 2 | Não | Sim |
| 66 | `improvement-worked` | Ponto de melhoria trabalhado | Nova validação em que o validador registra que um ponto anterior evoluiu | `validation_recorded*` (campo novo) | 2 | Vaga | Sim |
| 67 | `validated-as-declared` | Validado no que declarou | Validação numa competência declarada antes | Derivado | 2 | Não | Sim |

### 7. Contribuição para a comunidade (`community`)

| # | Chave | Conquista | Como desbloqueia | Evento | Etapa | Acesso | Privada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 68 | `captain` | Capitão | Alocado como capitão de um squad | `squad_captain_assigned*` | 2 | Vaga |  |
| 69 | `captain-shipped` | Capitão de projeto entregue | Capitão de um projeto encerrado com entregas aceitas | `squad_project_closed*` | 2 | Vaga |  |
| 70 | `first-of-the-team` | Primeira entrega da turma | Um membro do squad dele teve a primeira entrega aceita | `delivery_accepted` | 2 | Não |  |
| 71 | `feedback-worked` | Retorno que funcionou | Um membro que ele recusou foi aceito depois | `squad_application_decided` | 2 | Não | Sim |
| 72 | `validator` | Validador | Habilitado como validador | `validator_application_decided` | 2 | Não |  |
| 73 | `first-validation-given` | Primeira validação feita | Registrou a primeira validação | `validation_recorded` | 2 | Não |  |
| 74 | `no-training-wheels` | Sem rodinhas | Saiu da revisão obrigatória (5 validações revisadas) | `validation_review_decided` | 2 | Não |  |
| 75 | `first-commit-reviewer` | Revisor de primeiro commit | Revisou e fez o merge de um teste de entrada | `squad_test_approved` | 2 | Não |  |
| 76 | `helped-someone` | Ajudou alguém | Creditado como "Ajudado por" no registro de outro membro | `trajectory_helper_credited*` | D | Não |  |

Sem contagem de validações feitas nem de candidaturas avaliadas.

### 8. Tempo de casa (`tenure`)

Só reconhecimento. Contaria para o acesso apenas se o critério mudar (opção C).

| # | Chave | Conquista | Como desbloqueia | Evento | Etapa | Acesso | Privada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 77 | `one-month-hub` | Um mês de Hub | 30 dias desde `onboardedAt` | Derivado | F | Decisão |  |
| 78 | `six-months-hub` | Seis meses de Hub | 6 meses desde `onboardedAt` | Derivado | F | Decisão |  |
| 79 | `one-year-hub` | Um ano de Hub | 12 meses desde `onboardedAt`; repete a cada ano | Derivado | F | Decisão |  |
| 80 | `he4rt-before-hub` | He4rt antes do Hub | Estava na comunidade antes do Hub, com prova | Manual | M | Não |  |
| 81 | `one-year-evidence` | Um ano com evidência | 12 meses entre a primeira e a última evidência | Derivado | 2 | Vaga |  |

### 9. Basement, Job Finder e mercado (`market`)

| # | Chave | Conquista | Como desbloqueia | Evento | Etapa | Acesso | Privada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 82 | `ready-to-apply` | Pronto para candidatura | Concluiu a preparação no Job Finder | `jobfinder_prep_completed*` | 3 | Não | Sim |
| 83 | `first-application` | Primeira candidatura | Primeira candidatura com consentimento no mural | `job_applied` | 3 | Não | Sim |
| 84 | `went-to-market` | Saiu para o mercado | Primeiro emprego na área, confirmado pela administração | Manual | M | Não |  |

### 10. Concedidas pela administração (`manual`)

| # | Chave | Conquista | Como desbloqueia | Etapa | Acesso |
| --- | --- | --- | --- | --- | --- |
| 85 | `he4rt-event` | Evento He4rt | Entrega num hackathon ou evento da comunidade, não presença | M | Não |
| 86 | `community-to-community` | Da comunidade para a comunidade | Contribuição fora do Hub: palestra, conteúdo, organização de evento | M | Não |

### O que nunca vira conquista

- Mensagens, voz ou presença em calls.
- Login diário, sequência de dias e "última atividade".
- Seguidores, curtidas, reações e visitas ao perfil.
- Número de commits, linhas ou PRs.
- Posições e qualquer comparação entre membros.
- O conteúdo de uma validação (positiva, construtiva, sem pontos de melhoria).
- Recusar candidaturas ou declarar conflito de interesse, que são deveres.

## Perfil

### O que o visitante vê

- O estágio da jornada mais alto publicado, e "Contribuidor" se tiver.
- As conquistas que o membro publicou, agrupadas por grupo do catálogo, com nome, descrição e mês em que
  foram desbloqueadas.
- Conquista manual com a origem "concedida pela administração".
- Nunca: total de conquistas, conquistas bloqueadas, XP de outra pessoa, raridade.

### O que o dono vê, além disso

- As conquistas privadas, marcadas "Só você vê", com o motivo (por exemplo, "a validação de origem não está
  publicada").
- Os próximos marcos do estágio, sem prazo e sem contagem regressiva.

### Modelos em teste no protótipo

Três modelos do mesmo dado, para o Daniel escolher. A troca fica na URL (`?conquistas=`) e nas ações de debug.

| Modelo | Onde fica | Para quê |
| --- | --- | --- |
| `vitrine` (padrão) | Caixa na coluna lateral, com as medalhas em grade e "Ver todas" | Mostra pouco, sem competir com a trajetória |
| `jornada` | Faixa abaixo do cabeçalho com os cinco estágios e as medalhas do estágio atual | Destaca a evolução por evidência |
| `aba` | Aba "Conquistas" ao lado de "Trajetória" e "Sobre", com todos os grupos | Lista completa, com data e origem |

## Acesso à área de vagas

Ainda sem decisão. As opções estão no plano: A (piso literal do roadmap), B (piso com tempo de evidência,
recomendada) e C (tempo de casa e publicações, que muda o `PRODUCT.md`). Até a decisão, nenhuma conquista
libera acesso e o protótipo não mostra checklist de acesso.

## Medição

Eventos novos: `achievement_unlocked`, `achievement_granted`, `achievement_published`,
`achievement_unpublished`, `achievement_revoked`, além dos marcados com `*` no catálogo.

## Perguntas em aberto

1. Critério do mural: A, B ou C.
2. "Participou de squad" é entrar ou ter entrega aceita.
3. Validação com evidência insuficiente conta para o estágio "Validado".
4. Qual modelo de perfil fica, ou se fica uma combinação.
5. O XP aparece no perfil público ou só para o membro.
6. Quem concede conquista manual (só a administração ou também capitães) e com que limite.
7. Existe fonte confiável para "He4rt antes do Hub" (cargo do Discord, cadastro antigo).
