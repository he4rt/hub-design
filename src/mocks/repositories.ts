import type { RepositoryRead } from './db'

/**
 * Stand-in for the GitHub API: the public repositories the He4rt GitHub App can read, keyed by
 * `owner/name` in lower case. The Laravel app would fetch the repository and its root files instead.
 */

const PRODUCT_FILA_ZERO = `# Fila Zero

## O problema

Clínicas com um ou dois profissionais ainda marcam por telefone e caderno. A recepção passa a manhã ligando para confirmar, e quem falta não avisa.

## Para quem

Recepcionistas de clínicas pequenas, que não têm sistema e atendem o telefone o dia todo.

## O que já funciona

- Agenda por profissional, com bloqueio de horários
- Confirmação pelo WhatsApp 24 h antes
- Painel do dia para a recepção

## O que ainda não funciona

- Lista de espera quando alguém desmarca
`

const METRICS_FILA_ZERO = `# Métricas do Fila Zero

| Métrica | Meta | Atual | Como medimos |
| --- | --- | --- | --- |
| Faltas sem aviso | menos de 10% | 14% | consultas sem check-in e sem cancelamento, por semana |
| Confirmações respondidas | 80% | 71% | respostas ao WhatsApp em até 12 h |
| Tempo da recepção ao telefone | menos de 1 h por dia | 2 h | registro manual da recepção |
`

const README_FILA_ZERO = `# fila-zero

Agenda para clínicas pequenas, em Laravel e Livewire.

## Rodando

1. Copie o .env.example para .env
2. Rode composer install e php artisan migrate --seed
3. Rode php artisan serve

## Contribuindo

Issues marcadas com good first issue são um bom começo.
`

const PRODUCT_CADERNO = `# Caderno de estudos

## O problema

Quem estuda sozinho anota em vários lugares e perde o fio: não sabe o que já viu, nem o que revisar.

## Para quem

Pessoas em transição de carreira estudando programação no tempo livre.

## O que já funciona

- Anotações por tema, em Markdown
- Lembrete de revisão depois de 1, 7 e 30 dias
`

const METRICS_CADERNO = `# Métricas

| Métrica | Meta | Atual | Como medimos |
| --- | --- | --- | --- |
| Revisões feitas no dia | 60% | 48% | revisões concluídas sobre as agendadas |
`

const README_CADERNO = `# caderno-de-estudos

Anotações com revisão espaçada. Next.js e SQLite.
`

export const REPOSITORIES: Record<string, RepositoryRead> = {
  'diego-ramos/fila-zero': {
    name: 'Fila Zero',
    description: 'Agenda de clínica sem fila na porta',
    language: 'PHP',
    license: 'MIT',
    pushedAt: '2026-11-20T18:10:00Z',
    files: { product: PRODUCT_FILA_ZERO, metrics: METRICS_FILA_ZERO, readme: README_FILA_ZERO },
  },
  'ana-souza/caderno-de-estudos': {
    name: 'Caderno de estudos',
    description: 'Anotações com revisão espaçada para quem estuda sozinho',
    language: 'TypeScript',
    license: 'MIT',
    pushedAt: '2026-11-15T22:40:00Z',
    files: { product: PRODUCT_CADERNO, metrics: METRICS_CADERNO, readme: README_CADERNO },
  },
  'marina-duarte/acessa-form': {
    name: 'acessa-form',
    description: 'Componentes de formulário acessíveis para React',
    language: 'TypeScript',
    license: 'Apache-2.0',
    pushedAt: '2026-11-12T10:00:00Z',
    files: {
      product: null,
      metrics: null,
      readme: '# acessa-form\n\nInputs, selects e mensagens de erro que funcionam com leitor de tela.\n',
    },
  },
  'danielhe4rt/agenda-de-lives': {
    name: 'Agenda de lives',
    description: 'Calendário das lives da He4rt com lembrete no Discord',
    language: 'PHP',
    license: 'MIT',
    pushedAt: '2026-11-21T14:00:00Z',
    files: {
      product: `# Agenda de lives

## O problema

As lives da comunidade são anunciadas só no Discord, e quem entra depois não acha a agenda.

## Para quem

Membros da He4rt que acompanham as lives mas não ficam no Discord o dia todo.

## O que já funciona

- Lista das próximas lives
- Lembrete no Discord 1 h antes
`,
      metrics: null,
      readme: '# agenda-de-lives\n\nLaravel 12 e um bot do Discord.\n',
    },
  },
  'danielhe4rt/dotfiles': {
    name: 'dotfiles',
    description: null,
    language: 'Shell',
    license: null,
    pushedAt: '2026-10-02T09:00:00Z',
    files: { product: null, metrics: null, readme: null },
  },
}

/** `owner/name` from a pasted link: `https://github.com/owner/name`, `github.com/owner/name/` or `owner/name`. */
export function parseRepository(link: string): string | null {
  const match = link
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^(www\.)?github\.com\//, '')
    .replace(/\.git$/, '')
    .match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)\/?$/)
  return match ? `${match[1]}/${match[2]}` : null
}
