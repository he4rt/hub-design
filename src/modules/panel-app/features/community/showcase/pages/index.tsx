import { Link, useNavigate, useSearchParams } from 'react-router'
import { MessageSquare, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, useDb, type ShowcaseArea, type ShowcaseProject } from '@/mocks/db'
import { ShowcaseCard } from '../components/showcase-card'
import { AREA_LABELS, AREAS, filterShowcase, readFilters, showcaseCards } from '../lib/showcase-filters'
import './index.css'

/** Debug only: projects spread over the last weeks, in every area, to see a full grid. */
function generateProjects(count: number): ShowcaseProject[] {
  const users = db.get().users
  return Array.from({ length: count }, (_, index) => ({
    id: `debug-showcase-${crypto.randomUUID()}`,
    slug: `projeto-gerado-${index + 1}-${crypto.randomUUID().slice(0, 6)}`,
    title: `Projeto gerado ${index + 1}`,
    summary: 'Projeto de exemplo para ver a grade com muitos cards e testar o corte da descrição em duas linhas.',
    area: AREAS[index % AREAS.length],
    authorId: users[index % users.length].id,
    coverUrl: null,
    publishedAt: new Date(Date.now() - index * 36 * 3_600_000).toISOString(),
    // Every third one is open to general feedback.
    helpRequests: index % 3 === 2 ? [] : [{ question: 'O que falta para a primeira versão?', context: null, topic: null }],
  }))
}

/** Showcase: projects members present to get feedback, newest first or A–Z, never by engagement. */
export default function ShowcaseIndex() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const projects = useDb((state) => state.showcaseProjects)
  const feedbacks = useDb((state) => state.showcaseFeedbacks)
  const users = useDb((state) => state.users)
  const filters = readFilters(params)
  const { projects: visible, counts } = filterShowcase(
    showcaseCards({ showcaseProjects: projects, showcaseFeedbacks: feedbacks, users }),
    filters,
  )

  function setParam(name: string, value: string | null) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(name, value)
        else next.delete(name)
        return next
      },
      // Typing a search replaces the entry, so Back leaves the page instead of undoing letters.
      { replace: name === 'q', preventScrollReset: true },
    )
  }

  useDebugActions('Showcase', [
    { label: 'Gerar 30 projetos', run: () => db.set((state) => ({ ...state, showcaseProjects: [...generateProjects(30), ...state.showcaseProjects] })) },
    { label: 'Esvaziar o Showcase', run: () => db.set((state) => ({ ...state, showcaseProjects: [], showcaseFeedbacks: [] })) },
    { label: 'Mostrar só os sem retorno', run: () => navigate('/app/showcase?feedback=none') },
    { label: 'Buscar "laravel"', run: () => navigate('/app/showcase?q=laravel') },
    { label: 'Buscar sem resultado', run: () => navigate('/app/showcase?q=kubernetes-quantico') },
    { label: 'Design de A a Z', run: () => navigate('/app/showcase?area=design&sort=az') },
  ])

  const total = visible.length
  const areaTabs: (ShowcaseArea | null)[] = [null, ...AREAS]

  return (
    <div className="showcase-index">
      <header className="showcase-index__header">
        <div>
          <h1>Showcase</h1>
          <p className="showcase-index__subtitle">Projetos da comunidade</p>
          <p className="showcase-index__lead">Abra um projeto, entenda o que a pessoa fez e responda ao que ela pediu.</p>
        </div>
        <Button asChild>
          <Link to="/app/showcase/new">
            <Plus size={16} aria-hidden />
            Apresentar um projeto
          </Link>
        </Button>
      </header>

      <div className="showcase-index__areas" role="group" aria-label="Área">
        {areaTabs.map((area) => {
          const active = filters.area === area
          return (
            <Toggle
              key={area ?? 'all'}
              className="showcase-index__area"
              pressed={active}
              onPressedChange={() => setParam('area', area)}
            >
              {area ? AREA_LABELS[area] : 'Todos'}
              <Badge variant={active ? 'count' : 'neutral'} className="showcase-index__area-count">
                {area ? counts[area] : counts.all}
              </Badge>
            </Toggle>
          )
        })}
      </div>

      <div className="showcase-index__tools">
        <label className="showcase-index__search">
          <Search size={18} aria-hidden />
          <Input
            type="search"
            value={filters.query}
            placeholder="Buscar projeto, pessoa ou ferramenta"
            aria-label="Buscar projeto, pessoa ou ferramenta"
            onChange={(event) => setParam('q', event.target.value || null)}
          />
        </label>
        <Toggle pressed={filters.withoutFeedback} onPressedChange={(pressed) => setParam('feedback', pressed ? 'none' : null)}>
          <MessageSquare size={16} aria-hidden />
          Ainda sem retorno
        </Toggle>
        <div className="showcase-index__sort">
          <span id="showcase-sort">Ordenar</span>
          <ToggleGroup
            type="single"
            aria-labelledby="showcase-sort"
            value={filters.sort}
            onValueChange={(value) => value && setParam('sort', value === 'az' ? 'az' : null)}
          >
            <ToggleGroupItem value="recent">Mais recentes</ToggleGroupItem>
            <ToggleGroupItem value="az">A–Z</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <p className="showcase-index__total" aria-live="polite">
        {total === 1 ? '1 projeto' : `${total} projetos`}
      </p>

      {total > 0 ? (
        <ul className="showcase-index__grid">
          {visible.map((project) => (
            <li key={project.id}>
              <ShowcaseCard project={project} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="showcase-index__empty">
          <h2>Nada por aqui com esses filtros</h2>
          <div>
            <Button variant="secondary" onClick={() => setParams({}, { preventScrollReset: true })}>
              Limpar filtros
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/app/showcase/new">Apresentar um projeto</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
