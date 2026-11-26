import type { CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Search } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDay } from '@/lib/dates'
import { feedbackCount, languageColor, type ProjectEntry } from '../lib/project-entries'
import './project-showcase.css'

const fold = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/**
 * Prototype "Showcase": a shelf of projects, each introduced by its maker. A gallery of cards with a
 * typographic cover (monogram and README in the language's color), the pitch as the headline and who
 * made it. Browsing, not answering: the feedback count is plain text and never an order.
 */
export function ProjectShowcase({ entries }: { entries: ProjectEntry[] }) {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const terms = fold(query).split(/\s+/).filter(Boolean)
  const language = params.get('lang')
  const owner = params.get('dono') === 'squad' ? 'squad' : params.get('dono') === 'member' ? 'member' : null
  const sort = params.get('ordem') === 'az' ? 'az' : 'recent'
  const languages = [...new Set(entries.map((e) => e.language).filter((l): l is string => !!l))].toSorted()

  function setParam(name: string, value: string | null) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(name, value)
      else next.delete(name)
      return next
    }, { replace: true, preventScrollReset: true })
  }

  const shown = entries
    .filter((e) => terms.every((t) => fold(`${e.name} ${e.pitch} ${e.repository?.fullName ?? ''} ${e.owner.name}`).includes(t)))
    .filter((e) => !language || e.language === language)
    .filter((e) => !owner || e.owner.kind === owner)
    .toSorted((a, b) => (sort === 'az' ? a.name.localeCompare(b.name) : b.createdAt.localeCompare(a.createdAt)))

  return (
    <div className="project-showcase">
      <header className="project-showcase__header">
        <div>
          <h1>Showcase</h1>
          <p>Projetos que a comunidade construiu. Abra, leia o que a pessoa fez e deixe um retorno.</p>
        </div>
        <Button>Mostrar meu projeto</Button>
      </header>

      <div className="project-showcase__filters">
        <label className="project-showcase__search">
          <Search size={18} aria-hidden />
          <Input type="search" value={query} placeholder="Buscar projeto, pessoa ou squad" aria-label="Buscar projetos" onChange={(e) => setParam('q', e.target.value || null)} />
        </label>
        <ToggleGroup type="single" aria-label="Quem fez" value={owner ?? 'all'} onValueChange={(v) => v && setParam('dono', v === 'all' ? null : v)}>
          <ToggleGroupItem value="all">Todos</ToggleGroupItem>
          <ToggleGroupItem value="member">Pessoais</ToggleGroupItem>
          <ToggleGroupItem value="squad">De squad</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup type="single" aria-label="Ordem" value={sort} onValueChange={(v) => v && setParam('ordem', v === 'recent' ? null : v)}>
          <ToggleGroupItem value="recent">Mais recentes</ToggleGroupItem>
          <ToggleGroupItem value="az">A–Z</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="project-showcase__languages" role="group" aria-label="Linguagem">
        {languages.map((l) => (
          <button key={l} type="button" className="project-showcase__language" aria-pressed={language === l} style={{ '--lang': languageColor(l) } as CSSProperties} onClick={() => setParam('lang', language === l ? null : l)}>
            {l}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="project-showcase__empty">Nenhum projeto com esses filtros.</p>
      ) : (
        <ul className="project-showcase__grid">
          {shown.map((e) => {
            const count = feedbackCount(e)
            const href = e.path ?? e.repository?.url ?? '#'
            const external = !e.path
            return (
              <li key={e.id} className="project-showcase__card" style={{ '--lang': languageColor(e.language) } as CSSProperties}>
                <div className="project-showcase__cover" aria-hidden>
                  <span className="project-showcase__monogram">{e.name.slice(0, 2)}</span>
                  {e.excerpt && <span className="project-showcase__excerpt">{e.excerpt}</span>}
                </div>
                <div className="project-showcase__body">
                  <h2>
                    {external ? (
                      <a href={href} target="_blank" rel="noreferrer" className="project-showcase__link">{e.name}</a>
                    ) : (
                      <Link to={`${href}?view=showcase`} className="project-showcase__link">{e.name}</Link>
                    )}
                  </h2>
                  <p className="project-showcase__pitch">{e.pitch}</p>
                  {e.repository && <span className="project-showcase__repo" title={e.repository.fullName}>{e.repository.fullName}</span>}
                </div>
                <footer className="project-showcase__footer">
                  <span className="project-showcase__maker">
                    {e.owner.kind === 'member' ? <Avatar src={e.owner.photoUrl} name={e.owner.name} size="xs" /> : <Avatar src={null} name={e.owner.name} size="xs" />}
                    <span>{e.owner.kind === 'squad' ? `Squad ${e.owner.name}` : e.owner.name}</span>
                  </span>
                  <span className="project-showcase__meta">
                    {count === 0 ? 'Sem retorno' : count === 1 ? '1 retorno' : `${count} retornos`}
                    {e.createdAt && <>, {formatDay(e.createdAt)}</>}
                  </span>
                </footer>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
