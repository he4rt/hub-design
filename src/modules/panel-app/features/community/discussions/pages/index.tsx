import { Link, useNavigate, useSearchParams } from 'react-router'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db, newId, useDb, type Discussion, type DiscussionCategory } from '@/mocks/db'
import { DiscussionList } from '@/modules/panel-app/components/discussion-list'
import { categoryLabels, lastActivity } from '@/modules/panel-app/lib/discussions'
import './index.css'

const PER_PAGE = 12
const CATEGORIES = Object.keys(categoryLabels) as DiscussionCategory[]
const STATUSES = { unanswered: 'Sem resposta', solved: 'Resolvidas' } as const
type Status = keyof typeof STATUSES

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

  const category = CATEGORIES.find((value) => value === params.get('category')) ?? null
  const status = (Object.keys(STATUSES) as Status[]).find((value) => value === params.get('status')) ?? null

  // Newest activity first; the forum never sorts by popularity.
  const filtered = discussions
    .filter((discussion) => !category || discussion.category === category)
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
    })
  }

  useDebugActions('Fórum', [
    {
      label: 'Gerar 30 discussões',
      run: () => db.set((state) => ({ ...state, discussions: [...generateDiscussions(30), ...state.discussions] })),
    },
    { label: 'Esvaziar o fórum', run: () => db.set((state) => ({ ...state, discussions: [] })) },
    { label: 'Mostrar só as sem resposta', run: () => navigate('/app/discussions?status=unanswered') },
    {
      label: 'Ver como visitante',
      description: 'Remove a sessão de membro.',
      run: () => db.set((state) => ({ ...state, session: null })),
    },
  ])

  const filtering = !!category || !!status

  return (
    <div className="discussions-index">
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

      <div className="discussions-index__filters">
        <div className="discussions-index__filter">
          <ToggleGroup
            type="single"
            aria-label="Categoria"
            value={category ?? 'all'}
            onValueChange={(value) => value && setParam('category', value === 'all' ? null : value)}
          >
            <ToggleGroupItem value="all">Todas</ToggleGroupItem>
            {CATEGORIES.map((value) => (
              <ToggleGroupItem key={value} value={value}>
                {categoryLabels[value]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="discussions-index__filter">
          <ToggleGroup
            type="single"
            aria-label="Situação"
            value={status ?? 'all'}
            onValueChange={(value) => value && setParam('status', value === 'all' ? null : value)}
          >
            <ToggleGroupItem value="all">Qualquer situação</ToggleGroupItem>
            {(Object.keys(STATUSES) as Status[]).map((value) => (
              <ToggleGroupItem key={value} value={value}>
                {STATUSES[value]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <Card className="discussions-index__list">
        <DiscussionList
          discussions={visible}
          emptyText={
            filtering
              ? 'Nenhuma discussão com esses filtros.'
              : 'Ainda não há discussões. Comece pela dúvida que está travando o seu estudo.'
          }
        />
      </Card>

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
  )
}
