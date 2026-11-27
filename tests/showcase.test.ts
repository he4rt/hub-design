import { expect, test } from 'bun:test'

Object.assign(globalThis, { __HUB_SERVER__: true, window: { matchMedia: () => ({ matches: false }) } })
const { seedState } = await import('../src/mocks/db')
const { HELP_TOPICS, filterShowcase, readFilters, showcaseCards } = await import('../src/modules/panel-app/features/community/showcase/lib/showcase-filters')

// The listing as the page reads it: the seed's projects and the filters of a query string.
const list = (query: string) => filterShowcase(showcaseCards(seedState), readFilters(new URLSearchParams(query)))
const titles = (query: string) => list(query).projects.map((p) => p.title)

test('the default listing shows every project, newest first', () => {
  expect(titles('')).toEqual([
    'Fila Zero',
    'Biblioteca de Bolso',
    'Filas no Laravel sem mistério',
    'Chuvas em SP com dados abertos',
    'Identidade do Meetup Front-end BH',
    'acessa-form',
    'Roteiro de mentoria para iniciantes',
  ])
})

test('the area filter keeps one area; the tab counts ignore the area but follow the other filters', () => {
  expect(titles('area=design')).toEqual(['Biblioteca de Bolso', 'Identidade do Meetup Front-end BH'])
  expect(list('area=design').counts).toEqual({ all: 7, development: 2, design: 2, content: 1, data: 1, other: 1 })
  expect(list('area=design&feedback=none').counts).toEqual({ all: 2, development: 1, design: 1, content: 0, data: 0, other: 0 })
  // An unknown area is no filter at all.
  expect(titles('area=games')).toHaveLength(7)
})

test('seed projects follow the model: 0 to 2 help requests, short texts, topics from the area list', () => {
  for (const project of seedState.showcaseProjects) {
    expect(project.summary.length).toBeLessThanOrEqual(140)
    expect(project.helpRequests.length).toBeLessThanOrEqual(2)
    for (const request of project.helpRequests) {
      expect(request.question.length).toBeLessThanOrEqual(120)
      expect((request.context ?? '').length).toBeLessThanOrEqual(280)
      if (request.topic) expect(HELP_TOPICS[project.area]).toContain(request.topic)
    }
  }
  for (const topics of Object.values(HELP_TOPICS)) expect(topics.length).toBeLessThanOrEqual(5)
})

test('search matches title, summary, author and the help questions, without accents or case', () => {
  expect(titles('q=MISTERIO')).toEqual(['Filas no Laravel sem mistério'])
  expect(titles('q=diego')).toEqual(['Fila Zero'])
  expect(titles('q=props')).toEqual(['acessa-form'])
  expect(titles('q=python notebooks')).toEqual(['Chuvas em SP com dados abertos'])
  // The second question counts too; the context never shows on the card, so it is not searched.
  expect(titles('q=testes com leitor')).toEqual(['acessa-form'])
  expect(titles('q=NVDA')).toEqual([])
  // Every term must match the same project.
  expect(titles('q=python figma')).toEqual([])
})

test('"Ainda sem retorno" keeps only projects with zero feedbacks', () => {
  expect(titles('feedback=none')).toEqual(['Biblioteca de Bolso', 'acessa-form'])
  expect(list('feedback=none').projects.every((p) => p.feedbackCount === 0)).toBe(true)
})

test('A–Z sorts by title ignoring case, and nothing sorts by engagement', () => {
  expect(titles('sort=az')).toEqual([
    'acessa-form',
    'Biblioteca de Bolso',
    'Chuvas em SP com dados abertos',
    'Fila Zero',
    'Filas no Laravel sem mistério',
    'Identidade do Meetup Front-end BH',
    'Roteiro de mentoria para iniciantes',
  ])
  expect(readFilters(new URLSearchParams('sort=popular')).sort).toBe('recent')
})

test('filters with no match leave an empty listing and zero counts', () => {
  const { projects, counts } = list('q=kubernetes-quantico&area=data')
  expect(projects).toEqual([])
  expect(counts).toEqual({ all: 0, development: 0, design: 0, content: 0, data: 0, other: 0 })
})
