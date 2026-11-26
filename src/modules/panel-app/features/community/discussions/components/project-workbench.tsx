import type { CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Search } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useNow } from '@/hooks/use-now'
import { formatDay, formatRelative } from '@/lib/dates'
import { useDb } from '@/mocks/db'
import { languageColor, REQUEST_STATUS as STATUS, requestStatus as statusOf, type RequestStatus as Status, type ProjectEntry } from '../lib/project-entries'
import './project-workbench.css'

const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()


/**
 * Prototype "Workbench": a queue of open requests, not a gallery. Each row is what the owner wants a
 * look at, with the project as context; the oldest waiting request comes first, never the popular one.
 * Beside it, how to give a good feedback and the viewer's own requests.
 */
export function ProjectWorkbench({ entries }: { entries: ProjectEntry[] }) {
  const now = useNow()
  const users = useDb((s) => s.users)
  const viewerId = useDb((s) => s.session?.userId ?? null)
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const terms = fold(query).split(/\s+/).filter(Boolean)
  const tab = (['waiting', 'talking', 'resolved'] as const).find((s) => s === params.get('pedido')) ?? 'open'

  function setParam(name: string, value: string | null) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(name, value)
      else next.delete(name)
      return next
    }, { replace: true, preventScrollReset: true })
  }

  const requests = entries.flatMap((entry) => entry.requests.map((request) => ({ entry, request, status: statusOf(request) })))
  const count = (s: Status) => requests.filter((r) => r.status === s).length
  const shown = requests
    .filter((r) => (tab === 'open' ? r.status !== 'resolved' : r.status === tab))
    .filter((r) => terms.every((t) => fold(`${r.request.title} ${r.request.body} ${r.entry.name} ${r.entry.repository?.fullName ?? ''}`).includes(t)))
    // Waiting longest first: a request left alone deserves the first look.
    .toSorted((a, b) => (tab === 'resolved' ? b.request.createdAt.localeCompare(a.request.createdAt) : a.request.createdAt.localeCompare(b.request.createdAt)))
  const mine = requests.filter((r) => r.request.authorId === viewerId)

  return (
    <div className="project-workbench">
      <header className="project-workbench__header">
        <div>
          <h1>Workbench</h1>
          <p>Projetos em andamento pedindo um olhar da comunidade. Escolha um pedido e diga o que funcionou e o que melhorar.</p>
        </div>
        <Button>Pedir retorno num projeto</Button>
      </header>

      <div className="project-workbench__body">
        <div className="project-workbench__main">
          <div className="project-workbench__filters">
            <ToggleGroup type="single" aria-label="Situação do pedido" value={tab} onValueChange={(v) => v && setParam('pedido', v === 'open' ? null : v)}>
              <ToggleGroupItem value="open">Abertos {count('waiting') + count('talking')}</ToggleGroupItem>
              <ToggleGroupItem value="waiting">Sem retorno {count('waiting')}</ToggleGroupItem>
              <ToggleGroupItem value="talking">Em conversa {count('talking')}</ToggleGroupItem>
              <ToggleGroupItem value="resolved">Resolvidos {count('resolved')}</ToggleGroupItem>
            </ToggleGroup>
            <label className="project-workbench__search">
              <Search size={18} aria-hidden />
              <Input type="search" value={query} placeholder="Buscar pedido ou projeto" aria-label="Buscar pedidos" onChange={(e) => setParam('q', e.target.value || null)} />
            </label>
          </div>

          {shown.length === 0 ? (
            <p className="project-workbench__empty">Nenhum pedido aqui agora. Veja os resolvidos ou peça retorno no seu projeto.</p>
          ) : (
            <ol className="project-workbench__queue">
              {shown.map(({ entry, request, status }) => {
                const requester = users.find((u) => u.id === request.authorId)
                const responders = [...new Set(request.replies.map((r) => r.authorId))]
                  .filter((id) => id !== request.authorId)
                  .flatMap((id) => users.filter((u) => u.id === id))
                return (
                  <li key={request.id} className="project-workbench__item" data-status={status} style={{ '--lang': languageColor(entry.language) } as CSSProperties}>
                    <div className="project-workbench__request">
                      <Link to={`/app/discussions/${request.id}?view=workbench`} className="project-workbench__ask" title={request.title}>
                        {request.title}
                      </Link>
                      <p className="project-workbench__detail" title={request.body}>{request.body}</p>
                      <p className="project-workbench__project">
                        <span className="project-workbench__repo">{entry.repository?.fullName ?? entry.name}</span>
                        {entry.language && <span className="project-workbench__lang">{entry.language}</span>}
                        <span>
                          {entry.owner.kind === 'squad' ? `Squad ${entry.owner.name}` : requester?.name ?? entry.owner.name}
                        </span>
                      </p>
                    </div>
                    <div className="project-workbench__state">
                      <Badge variant={STATUS[status].variant}>{STATUS[status].label}</Badge>
                      <time dateTime={request.createdAt} title={formatDay(request.createdAt)}>
                        pedido {formatRelative(request.createdAt, now)}
                      </time>
                      {responders.length > 0 && (
                        <span className="project-workbench__responders">
                          <span className="project-workbench__faces" aria-hidden>
                            {responders.slice(0, 3).map((u) => <Avatar key={u.id} src={u.photoUrl} name={u.name} size="xs" />)}
                          </span>
                          {responders.length === 1 ? responders[0].name.split(' ')[0] : `${responders[0].name.split(' ')[0]} e mais ${responders.length - 1}`}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        <aside className="project-workbench__side" aria-label="Para quem dá retorno">
          <section>
            <h2>Como dar um bom retorno</h2>
            <dl className="project-workbench__guide">
              <dt>O que funcionou</dt>
              <dd>Aponte algo concreto no código ou no produto.</dd>
              <dt>O que melhorar</dt>
              <dd>Um próximo passo que a pessoa consiga fazer.</dd>
              <dt>Por quê</dt>
              <dd>Explique o caminho: quem pediu está aprendendo.</dd>
            </dl>
          </section>
          <section>
            <h2>Seus pedidos</h2>
            {mine.length === 0 ? (
              <p className="project-workbench__muted">Você não tem pedidos abertos.</p>
            ) : (
              <ul className="project-workbench__mine">
                {mine.map(({ request, status }) => (
                  <li key={request.id}>
                    <Link to={`/app/discussions/${request.id}?view=workbench`} title={request.title}>{request.title}</Link>
                    <span>{STATUS[status].label}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
