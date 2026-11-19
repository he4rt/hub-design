# Estados e chips

Mapa dos estados do domínio para a família semântica de cor. Um estado nunca muda de família entre telas.

| Estado | Entidade | Família | Texto do chip |
| --- | --- | --- | --- |
| `provisioning` | projeto | neutral | Preparando |
| `active` | projeto, squad | success | Ativo |
| `inactive` | squad | neutral | Inativo |
| vacancy | squad sem capitão | warning | Sem capitão · vacancy |
| `open` | teste de entrada | info | Aguardando revisão |
| `approved` | teste de entrada | success | Teste aprovado |
| `closed` | teste de entrada | neutral | Fechado sem merge |
| `pending` | candidatura, entrega | warning | Pendente |
| `accepted` | candidatura | success | Aceita |
| `declined` | candidatura | neutral | Recusada com retorno |
| devolvida | entrega | warning | Devolvida |
| `queued` | pedido de validação | neutral | Na fila |
| `assigned` | pedido de validação | info | Atribuído a um validador |
| `in-review` | validação | warning | Em revisão do admin |
| `recorded` | validação | success | Registrada |
| evidência insuficiente | validação | neutral | Evidência insuficiente |
| contestação aberta | validação | warning | Revisão em andamento |
| Técnica / Não técnica | item do board | brand-soft / neutral | Técnica · Não técnica |
| competência | critério de avaliação | brand-soft | nome da competência |

Regras:

- Chip é `label` (12/600) em pílula de 24px de altura, padding 0 10px.
- Um chip de família semântica nunca leva ícone; o ícone fica no botão ou no título ao lado.
- Contagens em navegação usam pílula 20px em `brand-bright` com `on-brand`.
