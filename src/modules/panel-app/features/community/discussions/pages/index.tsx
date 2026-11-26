import { useId, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { CircleCheck, CircleDashed, Inbox, ListFilter, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, newId, useDb, type Discussion, type DiscussionCategory } from '@/mocks/db'
import { DiscussionList } from '@/modules/panel-app/components/discussion-list'
import { categoryLabels, lastActivity } from '@/modules/panel-app/lib/discussions'
import { ProjectShowcase } from '../components/project-showcase'
import { ProjectWorkbench } from '../components/project-workbench'
import { projectEntries } from '../lib/project-entries'
import './index.css'

const PER_PAGE = 12
const CATEGORIES = Object.keys(categoryLabels) as DiscussionCategory[]
const STATUSES = { unanswered: 'Sem resposta', solved: 'Resolvidas' } as const
const STATUS_ICONS = { all: Inbox, unanswered: CircleDashed, solved: CircleCheck }
type Status = keyof typeof STATUSES

/** Lowercase without accents, so "funcao" finds "função". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Debug only: discussions spread over the last weeks, to see the list with many entries. */
function generateDiscussions(count: number): Discussion[] {
  const { users, squads, projects } = db.get()
  const contexts = [
    null,
    ...squads.map((squad) => ({ type: 'squad' as const, id: squad.id })),
    ...projects.map((project) => ({ type: 'project' as const, id: project.id })),
  ]
  return Array.from({ length: count }, (_, i) => {
    const createdAt = new Date(Date.now() - (i + 1) * 9 * 3_600_000).toISOString()
    const replyCount = i % 4
    return {
      id: newId(),
      title: `Discussão gerada ${i + 1}: como organizar ${['testes', 'migrations', 'filas', 'componentes'][i % 4]} no projeto`,
      category: CATEGORIES[i % CATEGORIES.length],
      authorId: users[i % users.length].id,
      body: 'Discussão gerada pelo painel de debug para ver a lista com muitos itens.',
      createdAt,
      context: contexts[i % contexts.length],
      replies: Array.from({ length: replyCount }, (_, r) => ({
        id: newId(),
        authorId: users[(i + r + 1) % users.length].id,
        body: 'Resposta gerada pelo painel de debug.',
        createdAt: new Date(new Date(createdAt).getTime() + (r + 1) * 3_600_000).toISOString(),
      })),
      solvedReplyId: null,
    }
  })
}

/** Forum: questions, answers, and technical discussions, readable without login. */
export default function DiscussionsIndex() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const discussions = useDb((state) => state.discussions)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const state = useDb((s) => s)
  // Prototype: the current Fórum and the two readings of a projects area, compared on one page.
  const view = params.get('view') === 'showcase' ? 'showcase' : params.get('view') === 'workbench' ? 'workbench' : 'forum'

  const category = CATEGORIES.find((value) => value === params.get('category')) ?? null
  const status = (Object.keys(STATUSES) as Status[]).find((value) => value === params.get('status')) ?? null
  const query = params.get('q') ?? ''
  const terms = fold(query).split(/\s+/).filter(Boolean)

  // Newest activity first; the forum never sorts by popularity.
  const filtered = discussions
    .filter((discussion) => !category || discussion.category === category)
    .filter((discussion) => terms.every((term) => fold(`${discussion.title} ${discussion.body}`).includes(term)))
    .filter((discussion) =>
      status === 'unanswered' ? discussion.replies.length === 0 : status === 'solved' ? !!discussion.solvedReplyId : true,
    )
    .toSorted((a, b) => lastActivity(b).localeCompare(lastActivity(a)))
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const page = Math.min(Math.max(1, Number(params.get('page')) || 1), pages)
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function setParam(name: string, value: string | null) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(name, value)
      else next.delete(name)
      if (name !== 'page') next.delete('page')
      return next
      // Typing a search replaces the entry, so Back leaves the page instead of undoing letters.
    }, { replace: name === 'q', preventScrollReset: true })
  }

  useDebugActions('Fórum', [
    {
      label: 'Gerar 30 discussões',
      run: () => db.set((state) => ({ ...state, discussions: [...generateDiscussions(30), ...state.discussions] })),
    },
    { label: 'Esvaziar o fórum', run: () => db.set((state) => ({ ...state, discussions: [] })) },
    { label: 'Mostrar só as sem resposta', run: () => navigate('/app/discussions?status=unanswered') },
    { label: 'Buscar "fila"', run: () => navigate('/app/discussions?q=fila') },
    { label: 'Buscar sem resultado', run: () => navigate('/app/discussions?q=kubernetes-quantico') },
    {
      label: 'Ver como visitante',
      description: 'Remove a sessão de membro.',
      run: () => db.set((state) => ({ ...state, session: null })),
    },
  ])

  /** The same page with one filter changed, keeping the others and the search. */
  function href(name: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    next.delete('page')
    const search = next.toString()
    return `/app/discussions${search ? `?${search}` : ''}`
  }

  const activeFilters = Number(!!category) + Number(!!status)
  const filtering = !!category || !!status || terms.length > 0

  return (
    <div className="discussions-index">
      <div className="discussions-index__poc">
        <span id="forum-poc-label">Proposta em teste</span>
        <ToggleGroup
          type="single"
          aria-labelledby="forum-poc-label"
          value={view}
          onValueChange={(value) => value && setParams(value === 'forum' ? {} : { view: value }, { replace: true, preventScrollReset: true, viewTransition: true })}
        >
          <ToggleGroupItem value="forum">Fórum atual</ToggleGroupItem>
          <ToggleGroupItem value="showcase">Showcase</ToggleGroupItem>
          <ToggleGroupItem value="workbench">Workbench</ToggleGroupItem>
        </ToggleGroup>
      </div>
      {view === 'showcase' ? (
        <ProjectShowcase entries={projectEntries(state)} />
      ) : view === 'workbench' ? (
        <ProjectWorkbench entries={projectEntries(state)} />
      ) : (
        <>
      <PageHeader
        title="Fórum"
        description="Tire dúvidas, peça ajuda com seu projeto e compartilhe caminhos. Discussões de projetos pessoais ficam entre membros."
        actions={
          <Button asChild>
            <Link to="/app/discussions/new">
              <Plus size={16} aria-hidden />
              Nova discussão
            </Link>
          </Button>
        }
      />

      {/* The list with its search; beside it, where to look: by kind (each with its color) and by situation. */}
      <div className="discussions-index__body">
        <div className="discussions-index__main">
          <div className="discussions-index__search-row">
            <label className="discussions-index__search">
              <Search size={18} aria-hidden />
              <Input
                type="search"
                value={query}
                placeholder="Buscar por título ou conteúdo"
                aria-label="Buscar discussões"
                onChange={(event) => setParam('q', event.target.value || null)}
              />
            </label>
            {/* On a phone the filter column folds into this one button, beside the search. */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="secondary" className="discussions-index__filters-button" aria-label={`Filtros${activeFilters ? `, ${activeFilters} ativo${activeFilters > 1 ? 's' : ''}` : ''}`}>
                  <ListFilter size={16} aria-hidden />
                  Filtros
                  {activeFilters > 0 && <span className="discussions-index__active">{activeFilters}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="discussions-index__popover" aria-label="Filtros do Fórum">
                <ForumFilters
                  category={category}
                  status={status}
                  discussions={discussions}
                  href={href}
                  onPick={() => setFiltersOpen(false)}
                />
              </PopoverContent>
            </Popover>
          </div>
          <DiscussionList
            discussions={visible}
            emptyText={
              terms.length > 0
                ? `Nenhuma discussão encontrada para "${query.trim()}".`
                : filtering
                  ? 'Nenhuma discussão com esses filtros.'
                  : 'Ainda não há discussões. Comece pela dúvida que está travando o seu estudo.'
            }
          />
          {pages > 1 && (
            <nav className="discussions-index__pages" aria-label="Páginas">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setParam('page', String(page - 1))}>
                Mais recentes
              </Button>
              <span>
                Página {page} de {pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === pages}
                onClick={() => setParam('page', String(page + 1))}
              >
                Mais antigas
              </Button>
            </nav>
          )}
        </div>

        <aside className="discussions-index__side" aria-label="Filtros do Fórum">
          <ForumFilters category={category} status={status} discussions={discussions} href={href} />
        </aside>
      </div>
        </>
      )}
    </div>
  )
}

/** Where to look: by kind (each with its color) and by situation. The column on a wide screen, the "Filtros" popover on a phone. */
function ForumFilters({
  category,
  status,
  discussions,
  href,
  onPick,
}: {
  category: DiscussionCategory | null
  status: Status | null
  discussions: Discussion[]
  href: (name: string, value: string | null) => string
  onPick?: () => void
}) {
  const id = useId()
  return (
    <>
          <nav className="discussions-index__group" aria-labelledby={`${id}-category`}>
            <h2 id={`${id}-category`}>Categorias</h2>
            <ul>
              {[null, ...CATEGORIES].map((value) => (
                <li key={value ?? 'all'}>
                  <Link
                    to={href('category', value)}
                    replace
                    preventScrollReset
                    className="discussions-index__filter"
                    onClick={onPick}
                    aria-current={category === value ? 'true' : undefined}
                  >
                    <span className="discussions-index__dot" data-category={value ?? 'all'} aria-hidden />
                    <span>{value ? categoryLabels[value] : 'Todas'}</span>
                    <span className="discussions-index__count">
                      {value ? discussions.filter((d) => d.category === value).length : discussions.length}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav className="discussions-index__group" aria-labelledby={`${id}-status`}>
            <h2 id={`${id}-status`}>Situação</h2>
            <ul>
              {([null, ...Object.keys(STATUSES)] as (Status | null)[]).map((value) => {
                const Icon = STATUS_ICONS[value ?? 'all']
                return (
                  <li key={value ?? 'all'}>
                    <Link
                      to={href('status', value)}
                      replace
                      preventScrollReset
                      className="discussions-index__filter"
                    onClick={onPick}
                      data-status={value ?? 'all'}
                      aria-current={status === value ? 'true' : undefined}
                    >
                      <Icon size={16} aria-hidden />
                      <span>{value ? STATUSES[value] : 'Todas'}</span>
                      {value === 'unanswered' && (
                        <span className="discussions-index__count">{discussions.filter((d) => d.replies.length === 0).length}</span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
    </>
  )
}
