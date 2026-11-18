# Conquistas: como são apuradas

Como a plataforma verifica, concede, esconde e revoga cada conquista. "Validação" aqui é a checagem das
regras, não a validação de competência feita pelo validador (essa está em `docs/validation.md`).

Catálogo e exibição em [`spec.md`](./spec.md); tipos em [`entities.md`](./entities.md).

## Quem concede

| Origem | Quem | Como |
| --- | --- | --- |
| Plataforma | O backend, num listener de evento | Ao receber o evento da tabela do catálogo, avalia a regra da conquista e grava se ela for verdadeira |
| Derivada | Um job diário | Recalcula as regras que dependem de tempo (meses diferentes, dias desde a entrada, um ano) |
| Administração | Admin ou super admin | Ação `panel-admin.members.achievements.store`, com motivo obrigatório |

Nenhuma rota do membro cria, edita ou apaga conquista. O membro só muda a visibilidade.

## Regras gerais

1. **Idempotente.** Cada conquista existe no máximo uma vez por membro (`userId` + `key`). Reavaliar um
   evento não duplica. A exceção é `one-year-hub`, que repete por ano e guarda o ano em `occurrence`.
2. **Sobre o registro, não sobre a contagem.** A regra lê os registros apurados (entregas, validações,
   publicações), nunca um contador editável.
3. **Fica para sempre.** Excluir a publicação de origem, despublicar uma validação ou sair do squad não
   retira a conquista. Só uma revogação retira.
4. **Data do fato.** `unlockedAt` é a data do evento que cumpriu a regra, não a data em que o job rodou.
   Isso evita que um recálculo atrasado mude a ordem no perfil.
5. **Sem XP manual.** Conquista concedida pela administração nunca gera XP.
6. **Sem acesso.** Nenhuma regra de acesso (mural, vagas) lê `MemberAchievement`. Ela lê os registros de
   origem diretamente.

## Visibilidade

| Caso | Padrão | Pode publicar? |
| --- | --- | --- |
| Conquista sem a marca "Privada" no catálogo | Privada | Sim, a qualquer momento |
| Conquista "Privada" | Privada | Só enquanto o registro de origem está publicado |
| Registro de origem despublicado depois | Some do perfil público automaticamente | Volta sozinha se o registro voltar a ser publicado e a conquista estava publicada |
| Perfil público desligado | Nada aparece | A escolha fica guardada |
| Conquista revogada | Some de todo lugar, inclusive para o dono | Não |

Publicar e esconder é `panel-app.profile.achievements.update`, uma conquista por vez, e dispara
`achievement_published` ou `achievement_unpublished`.

## Erros esperados (`MockError`)

| Ação | Quando recusa | Mensagem |
| --- | --- | --- |
| `panel-app.profile.achievements.update` | A conquista não é do membro da sessão | "Esta conquista não é sua." |
| `panel-app.profile.achievements.update` | Conquista privada e registro de origem não publicado | "Publique primeiro o registro que deu esta conquista." |
| `panel-app.profile.achievements.update` | Conquista revogada | "Esta conquista foi revogada." |
| `panel-admin.members.achievements.store` | Chave não é manual no catálogo | "Só conquistas manuais são concedidas pela administração." |
| `panel-admin.members.achievements.store` | Membro já tem a conquista | "O membro já tem esta conquista." |
| `panel-admin.members.achievements.store` | Motivo com menos de 20 caracteres | "Explique o motivo da concessão." |
| `panel-admin.members.achievements.destroy` (revogar) | Motivo com menos de 20 caracteres | "Explique o motivo da revogação." |
| `panel-admin.members.achievements.destroy` | Quem revoga é o próprio membro | "Você não pode revogar uma conquista sua." |

A interface lê as mesmas regras para esconder ou desabilitar o controle antes do clique.

## Revogação

- Só por fraude ou conduta, com motivo, autor e data. Grava `revokedAt`, `revokedBy` e `revokeReason`; o
  registro não é apagado.
- Dispara `achievement_revoked` e entra no log da administração.
- Se a conquista revogada era o marco de um estágio, o estágio é recalculado a partir dos registros que
  sobraram. É o único caso em que um estágio cai.

## Estágio da jornada

Calculado a cada leitura do perfil, a partir dos registros de origem, nunca guardado à parte:

1. `validated` se existe validação `recorded` (no perfil público: publicada).
2. `delivered` se existe entrega `accepted` com crédito ao membro.
3. `practicing` se o membro já entrou num squad (`squad_joined`).
4. `prepared` se o teste de entrada está `approved`.
5. `member` se `onboardedAt` não é nulo.

`contributor` é verdadeiro se o membro é ou foi capitão, validador habilitado ou revisor de teste de
entrada.

## Regras derivadas que pedem cuidado

| Conquista | Armadilha | Regra |
| --- | --- | --- |
| `three-months-trajectory`, `six-months-diary`, `three-months-squad`, `six-months-practice` | Contar meses seguidos vira streak | Meses **distintos** do calendário, em qualquer ordem |
| `thirty-days-squad` | Contar dias desde a entrada premia quem entrou e sumiu | Dias entre `squad_joined` e a **última entrega aceita** |
| `one-year-evidence` | Usar a data de cadastro | Primeira e última evidência: entrega aceita, validação registrada ou PR merged na organização |
| `one-month-hub`, `six-months-hub`, `one-year-hub` | `createdAt` inclui contas de outros produtos | Contar a partir de `onboardedAt` |
| `code-review` | Revisão de fachada | Só revisor creditado pelo capitão numa entrega aceita |
| `second-try`, `came-back-stronger`, `returned-and-accepted` | Revelam uma recusa | Privadas, sempre |
| `seven-posts` | Publicações excluídas | Conta publicações não excluídas no momento da sétima |

## Ações de debug no protótipo

- Trocar o modelo de exibição (vitrine, jornada, aba).
- Ver um perfil com muitas conquistas e um sem nenhuma.
- Ver como dono, com as privadas marcadas.
