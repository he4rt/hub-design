import type { MockDb, ShowcaseFeedback } from './db'

/** Feedbacks from the given members, a day apart from the publication onward. */
function feedbacks(projectId: string, publishedAt: string, authorIds: string[]): ShowcaseFeedback[] {
  return authorIds.map((authorId, index) => ({
    id: `${projectId}-feedback-${index + 1}`,
    projectId,
    authorId,
    body: 'Olhei o que você pediu e deixei minhas observações aqui.',
    createdAt: new Date(new Date(publishedAt).getTime() + (index + 1) * 86_400_000).toISOString(),
  }))
}

/**
 * Development seed for the Showcase: one project per area or more, with and without a cover and with
 * and without feedback. Every project here is fictional and exists only to exercise the screens.
 */
export const showcaseSeed: Pick<MockDb, 'showcaseProjects' | 'showcaseFeedbacks'> = {
  showcaseProjects: [
    {
      id: 'sp1',
      slug: 'fila-zero',
      title: 'Fila Zero',
      summary: 'Agenda para clínicas pequenas. Comecei para acabar com a fila na clínica da minha mãe; hoje três clínicas usam.',
      area: 'development',
      authorId: 'u9',
      coverUrl: '/showcase/fila-zero.svg',
      publishedAt: '2026-11-21T14:00:00Z',
      helpRequests: [
        { question: 'A consulta de faltas está contando certo?', context: 'Pacientes que remarcam no mesmo dia entram como falta no relatório do mês.', topic: 'Algo que não funciona' },
        { question: 'Como separo o agendamento das notificações?', context: null, topic: 'Arquitetura' },
      ],
    },
    {
      id: 'sp2',
      slug: 'biblioteca-de-bolso',
      title: 'Biblioteca de Bolso',
      summary: 'Redesign do app da biblioteca municipal para reservar livros pelo celular.',
      area: 'design',
      authorId: 'u8',
      coverUrl: '/showcase/biblioteca-de-bolso.svg',
      publishedAt: '2026-11-20T18:30:00Z',
      helpRequests: [{ question: 'A busca fica fácil de achar no celular?', context: 'Testei com três pessoas e duas procuraram a busca no rodapé.', topic: 'Usabilidade' }],
    },
    {
      id: 'sp3',
      slug: 'filas-no-laravel-sem-misterio',
      title: 'Filas no Laravel sem mistério',
      summary: 'Artigo para quem nunca usou jobs: do primeiro dispatch ao painel do Horizon.',
      area: 'content',
      authorId: 'u2',
      coverUrl: '/showcase/filas-no-laravel.svg',
      publishedAt: '2026-11-19T11:00:00Z',
      helpRequests: [{ question: 'Dá para seguir os exemplos sem nunca ter usado filas?', context: null, topic: null }],
    },
    {
      id: 'sp4',
      slug: 'chuvas-em-sp-com-dados-abertos',
      title: 'Chuvas em SP com dados abertos',
      summary: 'Análise de 20 anos de chuva na cidade, com notebooks em Python comentados passo a passo.',
      area: 'data',
      authorId: 'u6',
      coverUrl: '/showcase/chuvas-em-sp.svg',
      publishedAt: '2026-11-17T09:15:00Z',
      helpRequests: [{ question: 'Os gráficos sustentam as conclusões do notebook?', context: null, topic: 'Visualização' }],
    },
    {
      id: 'sp5',
      slug: 'identidade-do-meetup-front-end-bh',
      title: 'Identidade do Meetup Front-end BH',
      summary: 'Marca e peças no Figma para o encontro mensal de front-end da cidade.',
      area: 'design',
      authorId: 'u10',
      coverUrl: null,
      publishedAt: '2026-11-15T20:00:00Z',
      helpRequests: [],
    },
    {
      id: 'sp6',
      slug: 'acessa-form',
      title: 'acessa-form',
      summary: 'Componentes de formulário em React que funcionam bem com leitor de tela e teclado.',
      area: 'development',
      authorId: 'u3',
      coverUrl: null,
      publishedAt: '2026-11-14T16:45:00Z',
      helpRequests: [
        { question: 'Os nomes das props estão claros para quem chega agora?', context: null, topic: 'Revisão de código' },
        { question: 'O que falta nos testes com leitor de tela?', context: 'Hoje testo só com o NVDA no Windows.', topic: 'Testes' },
      ],
    },
    {
      id: 'sp7',
      slug: 'roteiro-de-mentoria-para-iniciantes',
      title: 'Roteiro de mentoria para iniciantes',
      summary: 'Guia de encontros quinzenais para quem está buscando a primeira vaga em tecnologia.',
      area: 'other',
      authorId: 'u7',
      coverUrl: null,
      publishedAt: '2026-11-12T13:00:00Z',
      helpRequests: [],
    },
  ],
  showcaseFeedbacks: [
    ...feedbacks('sp1', '2026-11-21T14:00:00Z', ['u2', 'u3', 'u4', 'u6', 'u7']),
    ...feedbacks('sp3', '2026-11-19T11:00:00Z', ['u3', 'u9', 'u10']),
    ...feedbacks('sp4', '2026-11-17T09:15:00Z', ['u2', 'u8']),
    ...feedbacks('sp5', '2026-11-15T20:00:00Z', ['u8']),
    ...feedbacks('sp7', '2026-11-12T13:00:00Z', ['u2', 'u4', 'u5', 'u11']),
  ],
}
