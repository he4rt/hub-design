import type { MockDb } from './db'

/**
 * Development seed for squads and validation. Every person, company and
 * validation here is fictional and exists only to exercise the screens.
 */
export const squadsSeed: Pick<
  MockDb,
  | 'squads'
  | 'projects'
  | 'memberships'
  | 'entryTests'
  | 'applications'
  | 'boardItems'
  | 'deliveries'
  | 'squadLog'
  | 'githubSync'
  | 'validatorApplications'
  | 'validators'
  | 'validationRequests'
  | 'validations'
  | 'contestations'
> = {
  squads: [
    {
      id: 's1',
      slug: 'loja-comunitaria',
      name: 'Loja Comunitária',
      description: 'Loja de produtos da comunidade, feita do catálogo ao checkout.',
      captainId: 'u6',
      status: 'active',
      createdAt: '2026-03-02T12:00:00Z',
    },
    {
      id: 's2',
      slug: 'agenda-he4rt',
      name: 'Agenda He4rt',
      description: 'Calendário dos eventos e calls da comunidade.',
      captainId: 'u1',
      status: 'inactive',
      createdAt: '2025-11-10T12:00:00Z',
    },
    {
      id: 's3',
      slug: 'bot-do-discord',
      name: 'Bot do Discord',
      description: 'Bot que avisa no Discord o que acontece no Hub.',
      captainId: null,
      status: 'inactive',
      createdAt: '2026-08-20T12:00:00Z',
    },
  ],
  projects: [
    {
      id: 'p1',
      squadId: 's1',
      slug: 'checkout',
      name: 'Checkout',
      goal: 'Checkout que calcula o frete por CEP, aplica cupons e fecha o pedido.',
      acceptanceCriteria: [
        { id: 'ac1', text: 'Frete calculado para CEP válido e erro claro para CEP inválido' },
        { id: 'ac2', text: 'Cupom aplicado com o desconto mostrado antes de fechar o pedido' },
        { id: 'ac3', text: 'Testes automatizados cobrindo frete e cupom' },
      ],
      evaluationCriteria: [
        { id: 'ec1', competency: 'Testes automatizados', description: 'Escreve testes que pegam regressões reais.' },
        { id: 'ec2', competency: 'Revisão de código', description: 'Revisa e responde revisões com clareza.' },
        { id: 'ec3', competency: 'Comunicação no time', description: 'Mantém o board e o time atualizados.' },
      ],
      stack: ['Laravel', 'Livewire', 'Pest'],
      expectedLevel: ['junior', 'mid'],
      seats: 5,
      applicationQuestions: [
        { id: 'q1', text: 'O que você quer praticar neste projeto?', required: true },
        { id: 'q2', text: 'Já escreveu testes automatizados? Conte como foi.', required: true },
        { id: 'q3', text: 'Quantas horas por semana você consegue dedicar?', required: false },
      ],
      repository: { fullName: 'he4rt/loja-checkout', url: 'https://github.com/he4rt/loja-checkout' },
      board: { number: 14, url: 'https://github.com/orgs/he4rt/projects/14' },
      status: 'active',
      startedAt: '2026-09-01T12:00:00Z',
      endedAt: null,
    },
    {
      id: 'p0',
      squadId: 's1',
      slug: 'catalogo',
      name: 'Catálogo',
      goal: 'Catálogo de produtos com busca e filtros por categoria.',
      acceptanceCriteria: [
        { id: 'ac1', text: 'Busca por nome com resultado em menos de um segundo' },
        { id: 'ac2', text: 'Filtro por categoria refletido na URL' },
      ],
      evaluationCriteria: [
        { id: 'ec1', competency: 'Modelagem de dados', description: 'Modela tabelas e índices para a busca.' },
        { id: 'ec2', competency: 'Acessibilidade', description: 'Componentes navegáveis por teclado.' },
      ],
      stack: ['Laravel', 'Livewire'],
      expectedLevel: ['junior'],
      seats: 4,
      applicationQuestions: [{ id: 'q1', text: 'O que você quer praticar neste projeto?', required: true }],
      repository: { fullName: 'he4rt/loja-catalogo', url: 'https://github.com/he4rt/loja-catalogo' },
      board: { number: 9, url: 'https://github.com/orgs/he4rt/projects/9' },
      status: 'ended',
      startedAt: '2026-03-10T12:00:00Z',
      endedAt: '2026-07-30T12:00:00Z',
    },
    {
      id: 'p2',
      squadId: 's2',
      slug: 'calendario',
      name: 'Calendário',
      goal: 'Calendário público das calls diárias e eventos da comunidade.',
      acceptanceCriteria: [{ id: 'ac1', text: 'Eventos exportáveis para Google Agenda e iCal' }],
      evaluationCriteria: [
        { id: 'ec1', competency: 'Integração com APIs', description: 'Integra serviços externos com tratamento de falha.' },
      ],
      stack: ['TypeScript', 'React'],
      expectedLevel: ['junior', 'mid'],
      seats: 4,
      applicationQuestions: [{ id: 'q1', text: 'O que você quer praticar neste projeto?', required: true }],
      repository: { fullName: 'he4rt/agenda', url: 'https://github.com/he4rt/agenda' },
      board: { number: 5, url: 'https://github.com/orgs/he4rt/projects/5' },
      status: 'ended',
      startedAt: '2025-11-15T12:00:00Z',
      endedAt: '2026-02-28T12:00:00Z',
    },
  ],
  memberships: [
    { ...membership('m1', 's1', 'p1', 'u6', '2026-09-01T12:00:00Z', 'Capitão: organiza o board e revisa os PRs.'), shownOnProfile: true },
    { ...membership('m2', 's1', 'p1', 'u2', '2026-09-05T12:00:00Z', 'Cálculo de frete e testes do checkout.'), shownOnProfile: true },
    membership('m3', 's1', 'p1', 'u7', '2026-09-08T12:00:00Z', 'Cupons de desconto.'),
    {
      ...membership('m4', 's1', 'p0', 'u6', '2026-03-10T12:00:00Z', 'Capitão.'),
      shownOnProfile: true,
      leftAt: '2026-07-30T12:00:00Z',
    },
    {
      ...membership('m5', 's1', 'p0', 'u10', '2026-03-12T12:00:00Z', 'Filtros e acessibilidade do catálogo.'),
      leftAt: '2026-07-30T12:00:00Z',
    },
    {
      ...membership('m6', 's2', 'p2', 'u1', '2025-11-15T12:00:00Z', 'Capitão.'),
      leftAt: '2026-02-28T12:00:00Z',
    },
    {
      ...membership('m7', 's2', 'p2', 'u10', '2025-11-20T12:00:00Z', 'Exportação para Google Agenda.'),
      leftAt: '2026-02-28T12:00:00Z',
    },
  ],
  entryTests: [
    entryTest('u2', 21, 'Adiciona meu nome ao mural', 'approved', '2026-08-20T12:00:00Z'),
    entryTest('u7', 24, 'Corrige link quebrado no README', 'approved', '2026-08-28T12:00:00Z'),
    entryTest('u10', 3, 'Primeiro commit', 'approved', '2026-02-20T12:00:00Z'),
    entryTest('u5', 31, 'Adiciona meu nome ao mural', 'approved', '2026-11-02T12:00:00Z'),
    entryTest('u11', 33, 'Meu primeiro PR na He4rt', 'open', '2026-11-12T12:00:00Z'),
  ],
  applications: [
    {
      id: 'a1',
      projectId: 'p1',
      userId: 'u5',
      answers: [
        { questionId: 'q1', answer: 'Quero praticar testes e trabalhar com revisão de código num time.' },
        { questionId: 'q2', answer: 'Escrevi alguns testes de unidade em PHPUnit no trabalho anterior.' },
        { questionId: 'q3', answer: '8 horas' },
      ],
      status: 'pending',
      notes: null,
      decision: null,
      githubInvite: 'not-needed',
      createdAt: '2026-11-10T12:00:00Z',
    },
    {
      id: 'a2',
      projectId: 'p1',
      userId: 'u10',
      answers: [
        { questionId: 'q1', answer: 'Quero praticar back-end, que nunca fiz em time.' },
        { questionId: 'q2', answer: 'Só testes de componentes no front-end.' },
      ],
      status: 'declined',
      notes: {
        strengths: 'Ótima comunicação no squad anterior e cuidado com acessibilidade.',
        improvements: 'Ainda não tem contato com Laravel; o projeto exige isso desde a primeira semana.',
        authorId: 'u6',
        updatedAt: '2026-09-03T12:00:00Z',
      },
      decision: {
        reason: 'Os lugares deste projeto foram para quem já tinha base em Laravel, que o checkout exige.',
        nextSteps: 'Faça o curso de Laravel da Basement e um CRUD pequeno com testes; candidate-se ao próximo projeto.',
        decidedBy: 'u6',
        decidedAt: '2026-09-03T12:00:00Z',
      },
      githubInvite: 'not-needed',
      createdAt: '2026-09-01T12:00:00Z',
    },
  ],
  boardItems: [
    boardItem('b1', 12, 'Calcular frete por CEP', 'done', 'technical', 'ac1', ['u2'], [
      { number: 34, merged: true, authorId: 'u2', coAuthorIds: ['u6'] },
    ]),
    boardItem('b2', 15, 'Aplicar cupom no carrinho', 'done', 'technical', 'ac2', ['u7'], [
      { number: 38, merged: true, authorId: 'u7', coAuthorIds: [] },
    ]),
    boardItem('b3', 16, 'Testes do cupom', 'in-progress', 'technical', 'ac3', ['u7'], []),
    boardItem('b4', 17, 'Documentar o fluxo do checkout', 'in-review', 'non-technical', null, ['u2'], []),
    boardItem('b5', 19, 'Fechar pedido', 'ready', 'technical', null, [], []),
    boardItem('b6', 20, 'Página de pedido confirmado', 'backlog', 'technical', null, [], []),
  ],
  deliveries: [
    {
      id: 'd1',
      projectId: 'p1',
      boardItemId: 'b1',
      title: 'Calcular frete por CEP',
      kind: 'technical',
      criterionId: 'ac1',
      status: 'accepted',
      collaboration: 'pair',
      credits: [
        { userId: 'u2', part: 'Cálculo do frete, tratamento de CEP inválido e testes' },
        { userId: 'u6', part: 'Pareamento na integração com a API dos Correios' },
      ],
      context: 'A Ana conduziu a entrega; eu pareei só na integração. Ela escreveu todos os testes.',
      evidence: [
        evidence('pull-request', 'loja-checkout#34', 'u2'),
        evidence('review', 'loja-checkout#34 (revisão)', 'u6'),
      ],
      returnedReason: null,
      decidedBy: 'u6',
      decidedAt: '2026-10-02T12:00:00Z',
      createdAt: '2026-10-01T12:00:00Z',
    },
    {
      id: 'd2',
      projectId: 'p1',
      boardItemId: 'b2',
      title: 'Aplicar cupom no carrinho',
      kind: 'technical',
      criterionId: 'ac2',
      status: 'pending',
      collaboration: 'individual',
      credits: [{ userId: 'u7', part: '' }],
      context: '',
      evidence: [evidence('pull-request', 'loja-checkout#38', 'u7')],
      returnedReason: null,
      decidedBy: null,
      decidedAt: null,
      createdAt: '2026-11-14T12:00:00Z',
    },
  ],
  squadLog: [
    log('l1', 's2', 'p2', 'project-started', 'u8', null, 'Calendário', '2025-11-15T12:00:00Z'),
    log('l2', 's2', 'p2', 'member-joined', 'u1', 'u10', null, '2025-11-20T12:00:00Z'),
    log('l3', 's2', 'p2', 'project-ended', 'u1', null, 'Calendário', '2026-02-28T12:00:00Z'),
    log('l4', 's1', 'p0', 'project-started', 'u8', null, 'Catálogo', '2026-03-10T12:00:00Z'),
    log('l5', 's1', 'p0', 'member-joined', 'u6', 'u10', null, '2026-03-12T12:00:00Z'),
    log('l6', 's1', 'p0', 'project-ended', 'u6', null, 'Catálogo', '2026-07-30T12:00:00Z'),
    log('l7', 's1', 'p1', 'project-started', 'u8', null, 'Checkout', '2026-09-01T12:00:00Z'),
    log('l8', 's1', 'p1', 'member-joined', 'u6', 'u2', null, '2026-09-05T12:00:00Z'),
    log('l9', 's1', 'p1', 'member-joined', 'u6', 'u7', null, '2026-09-08T12:00:00Z'),
    log('l10', 's1', 'p1', 'delivery-accepted', 'u6', 'u2', 'Calcular frete por CEP', '2026-10-02T12:00:00Z'),
  ],
  githubSync: {
    lastWebhookAt: '2026-11-18T10:42:00Z',
    lastSweepAt: '2026-11-18T06:00:00Z',
    divergences: [],
  },
  validatorApplications: [
    {
      id: 'va1',
      userId: 'u10',
      summary: 'Front-end há 4 anos, com foco em acessibilidade. Revisei PRs de dois squads como mantenedora.',
      links: ['https://github.com/leticia-prado', 'https://www.linkedin.com/in/leticia-prado'],
      jobTitle: 'Desenvolvedora front-end',
      company: 'Exemplo Tech',
      showEmployer: true,
      status: 'pending',
      decision: null,
      createdAt: '2026-11-11T12:00:00Z',
    },
  ],
  validators: [
    {
      userId: 'u9',
      approvedAt: '2026-06-01T12:00:00Z',
      jobTitle: 'Engenheiro de software',
      company: 'Empresa Exemplo',
      showEmployer: true,
      suspension: null,
      lastAssignedAt: '2026-10-05T12:00:00Z',
    },
    {
      userId: 'u1',
      approvedAt: '2026-05-01T12:00:00Z',
      jobTitle: 'Engenheiro de software',
      company: 'He4rt Developers',
      showEmployer: false,
      suspension: null,
      lastAssignedAt: null,
    },
  ],
  validationRequests: [
    {
      id: 'vr1',
      memberId: 'u2',
      projectId: 'p1',
      deliveryIds: ['d1'],
      criterionId: 'ec1',
      status: 'recorded',
      validatorId: 'u9',
      assignedAt: '2026-10-05T12:00:00Z',
      conflicts: [],
      createdAt: '2026-10-04T12:00:00Z',
    },
  ],
  validations: [
    {
      id: 'v1',
      requestId: 'vr1',
      memberId: 'u2',
      validatorId: 'u9',
      validator: { name: 'Diego Ramos', jobTitle: 'Engenheiro de software', company: 'Empresa Exemplo' },
      projectId: 'p1',
      competency: 'Testes automatizados',
      context: 'Entrega do cálculo de frete no projeto Checkout, feita em dupla com o capitão.',
      contribution: 'A Ana escreveu o cálculo e todos os testes; o capitão pareou só na integração externa.',
      strengths: [
        { text: 'Os testes cobrem o CEP inválido e a API fora do ar, os dois casos que mais quebram.', evidenceRef: 'loja-checkout#34' },
      ],
      improvements: [
        {
          text: 'Os testes repetem a montagem do carrinho em cada caso.',
          evidenceRef: 'loja-checkout#34',
          suggestion: 'Extrair a montagem para um dataset do Pest deixa cada caso com uma linha.',
        },
      ],
      conflictOfInterest: { declared: false, description: '' },
      insufficientEvidence: false,
      status: 'recorded',
      review: null,
      recordedAt: '2026-10-12T12:00:00Z',
      published: false,
      publishedAt: null,
      supersedesId: null,
    },
  ],
  contestations: [],
}

function membership(id: string, squadId: string, projectId: string, userId: string, joinedAt: string, responsibilities: string) {
  return { id, squadId, projectId, userId, responsibilities, joinedAt, leftAt: null, leftReason: null, shownOnProfile: false }
}

function entryTest(
  userId: string,
  number: number,
  title: string,
  status: 'open' | 'approved',
  openedAt: string,
) {
  return {
    userId,
    pullRequest: {
      repository: 'he4rt/primeiro-commit',
      number,
      title,
      url: `https://github.com/he4rt/primeiro-commit/pull/${number}`,
    },
    status,
    reviewer: status === 'approved' ? 'marina-duarte' : null,
    openedAt,
    approvedAt: status === 'approved' ? openedAt.replace('12:00', '18:00') : null,
  }
}

function boardItem(
  id: string,
  number: number,
  title: string,
  status: 'backlog' | 'ready' | 'in-progress' | 'in-review' | 'done',
  kind: 'technical' | 'non-technical',
  criterionId: string | null,
  assigneeIds: string[],
  pullRequests: { number: number; merged: boolean; authorId: string; coAuthorIds: string[] }[],
) {
  return {
    id,
    projectId: 'p1',
    issue: { number, title, url: `https://github.com/he4rt/loja-checkout/issues/${number}` },
    status,
    kind,
    criterionId,
    assigneeIds,
    pullRequests: pullRequests.map((pr) => ({ ...pr, url: `https://github.com/he4rt/loja-checkout/pull/${pr.number}` })),
    updatedAt: '2026-11-14T12:00:00Z',
  }
}

function evidence(kind: 'pull-request' | 'review', ref: string, authorId: string) {
  const number = ref.match(/#(\d+)/)?.[1]
  return { kind, ref, authorId, url: `https://github.com/he4rt/loja-checkout/pull/${number}` }
}

function log(
  id: string,
  squadId: string,
  projectId: string | null,
  kind:
    | 'project-started'
    | 'project-ended'
    | 'member-joined'
    | 'delivery-accepted',
  actorId: string,
  subjectId: string | null,
  detail: string | null,
  at: string,
) {
  return { id, squadId, projectId, kind, actorId, subjectId, detail, reason: null, at }
}
