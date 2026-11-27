import type { MockDb, ShowcaseArea, ShowcaseProject } from '@/mocks/db'

export const AREA_LABELS: Record<ShowcaseArea, string> = {
  development: 'Desenvolvimento',
  design: 'Design',
  content: 'Conteúdo',
  data: 'Dados',
  other: 'Outras áreas',
}
export const AREAS = Object.keys(AREA_LABELS) as ShowcaseArea[]

/** The topics a help request can name, up to 5 per area. */
export const HELP_TOPICS: Record<ShowcaseArea, string[]> = {
  development: ['Algo que não funciona', 'Arquitetura', 'Testes', 'Desempenho', 'Revisão de código'],
  design: ['Usabilidade', 'Hierarquia visual', 'Acessibilidade', 'Identidade visual', 'Fluxo'],
  content: ['Clareza', 'Estrutura', 'Revisão de texto', 'Público', 'Exemplos'],
  data: ['Metodologia', 'Visualização', 'Limpeza de dados', 'Conclusões', 'Ferramentas'],
  other: ['Organização', 'Clareza', 'Formato', 'Próximos passos', 'Divulgação'],
}

/** Never by engagement: the Showcase does not rank projects. */
export type ShowcaseSort = 'recent' | 'az'

/** What the query string asks for: `?area=design&q=laravel&feedback=none&sort=az`. */
export type ShowcaseFilters = { area: ShowcaseArea | null; query: string; withoutFeedback: boolean; sort: ShowcaseSort }

export function readFilters(params: URLSearchParams): ShowcaseFilters {
  return {
    area: AREAS.find((area) => area === params.get('area')) ?? null,
    query: params.get('q') ?? '',
    withoutFeedback: params.get('feedback') === 'none',
    sort: params.get('sort') === 'az' ? 'az' : 'recent',
  }
}

/** A project as its card reads it: the author's identity and the count of feedbacks (a `withCount`). */
export type ShowcaseCard = ShowcaseProject & { author: { name: string; photoUrl: string | null }; feedbackCount: number }

export function showcaseCards(state: Pick<MockDb, 'showcaseProjects' | 'showcaseFeedbacks' | 'users'>): ShowcaseCard[] {
  return state.showcaseProjects.flatMap((project) => {
    const author = state.users.find((user) => user.id === project.authorId)
    if (!author) return []
    const feedbackCount = state.showcaseFeedbacks.filter((feedback) => feedback.projectId === project.id).length
    return [{ ...project, author: { name: author.name, photoUrl: author.photoUrl }, feedbackCount }]
  })
}

/** Lowercase without accents, so "misterio" finds "mistério". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/**
 * The listing for the filters: the projects in order and, for the area tabs, how many each area has
 * with the other filters applied (so a tab never promises projects the list would not show).
 */
export function filterShowcase(cards: ShowcaseCard[], filters: ShowcaseFilters) {
  const terms = fold(filters.query).split(/\s+/).filter(Boolean)
  const matching = cards
    .filter((card) => !filters.withoutFeedback || card.feedbackCount === 0)
    .filter((card) => {
      const text = fold([card.title, card.summary, card.author.name, ...card.helpRequests.map((r) => r.question)].join(' '))
      return terms.every((term) => text.includes(term))
    })
  const counts = Object.fromEntries(AREAS.map((area) => [area, matching.filter((card) => card.area === area).length])) as Record<ShowcaseArea, number>
  const projects = matching
    .filter((card) => !filters.area || card.area === filters.area)
    .toSorted((a, b) =>
      filters.sort === 'az'
        ? a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })
        : b.publishedAt.localeCompare(a.publishedAt),
    )
  return { projects, counts: { all: matching.length, ...counts } }
}
