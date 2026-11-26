import { useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { Bookmark, ExternalLink, Eye, Flame, GitBranch, GitMerge, Lightbulb, MessageCircle, MessagesSquare, SmilePlus, Target, UsersRound, type LucideIcon } from 'lucide-react'
import { Popover, Tooltip } from 'radix-ui'
import { Avatar, Button, Chip, Node } from './parts'

/*
 * The proprietary components of the Traçado in the Malha language: line (path), node (record),
 * piece (competency) and arc (person). Each one draws data; none is decoration.
 */

const LEVELS = ['Declarada', 'Registrada', 'Demonstrada', 'Validada']
const QUARTERS = ['M14 14V3a11 11 0 0 1 11 11Z', 'M14 14h11a11 11 0 0 1-11 11Z', 'M14 14v11A11 11 0 0 1 3 14Z', 'M14 14H3A11 11 0 0 1 14 3Z']

/** Four quarters inside their square module, read clockwise from the top. Never alone: the level is written. */
function Piece({ level, size = 28 }: { level: number; size?: number }) {
  return (
    <svg className="tx-piece" width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <rect x="0.5" y="0.5" width="27" height="27" />
      {QUARTERS.map((d, i) => (
        <path key={d} d={d} className={i < level ? 'on' : 'off'} />
      ))}
    </svg>
  )
}

export function CompetencyLevel({ name, level, from }: { name: string; level: number; from?: number }) {
  return (
    <p className="tx-level">
      <Piece level={level} size={24} />
      <Chip tone="comp">{name}</Chip>
      <span>
        {from && from < level ? `Subiu de ${LEVELS[from - 1]} para ` : 'Nível '}
        <strong>{LEVELS[level - 1]}</strong>
      </span>
    </p>
  )
}

const STAGES = ['Membro', 'Preparado', 'Praticante', 'Com entrega', 'Validado']

/** The five stages on one line. After Validado the line goes on, dashed: there is no finish line. */
export function Journey({ current }: { current: number }) {
  return (
    <ol className="tx-journey" aria-label={`Estágio atual: ${STAGES[current]}, ${current + 1} de 5`}>
      {STAGES.map((stage, i) => (
        <li key={stage} className="tx-journey__stage" data-state={i < current ? 'done' : i === current ? 'current' : 'future'}>
          <span className="tx-journey__track" aria-hidden>
            <Node kind={i < current ? 'done' : i === current ? 'current' : 'future'} />
          </span>
          <span className="tx-journey__name">{stage}</span>
        </li>
      ))}
      <li className="tx-journey__tail" aria-hidden>
        <span className="tx-journey__track" />
      </li>
    </ol>
  )
}

/** A vertical, compact journey for a lateral column. */
export function JourneyCompact({ current }: { current: number }) {
  return (
    <ol className="tx-vjourney" aria-label={`Estágio atual: ${STAGES[current]}, ${current + 1} de 5`}>
      {STAGES.map((stage, i) => (
        <li key={stage} data-state={i < current ? 'done' : i === current ? 'current' : 'future'}>
          <Node kind={i < current ? 'done' : i === current ? 'current' : 'future'} />
          {stage}
        </li>
      ))}
    </ol>
  )
}

/** The measured result: from "before" to "after" on a line, the gain in a success chip. Only real numbers. */
export function Metric({ label, before, after, gain }: { label: string; before: string; after: string; gain?: string }) {
  return (
    <div className="tx-metric">
      <p className="tx-meta">{label}</p>
      <div className="tx-metric__values">
        <span className="tx-metric__before">{before}</span>
        <span className="tx-metric__line" role="img" aria-label="para">
          <Node kind="pending" />
          <i />
          <Node kind="done" />
        </span>
        <span className="tx-metric__after">{after}</span>
        {gain && <Chip tone="success">{gain}</Chip>}
      </div>
    </div>
  )
}

/** A recorded validation: the arc of the person who validated, the report in Geist, immutable. */
export function Validation() {
  return (
    <article className="tx-validation" aria-label="Validação registrada">
      <header className="tx-validation__head">
        <Node kind="validated" />
        <Chip tone="success">Registrada</Chip>
        <span className="tx-meta">Registrada em 18 de novembro de 2026.</span>
      </header>
      <div>
        <p className="tx-validation__voice">
          “A Ana separou a busca em um componente testável e explicou bem por que trocou a estratégia de cache. O
          índice composto ficou na ordem certa e a listagem caiu de 2,1 s para 40 ms.”
        </p>
        <ol className="tx-validation__points">
          <li>
            <Piece level={4} size={20} />
            <span>Modelagem de dados: o índice segue a ordem das consultas, com o plano anexado no PR.</span>
          </li>
          <li>
            <Piece level={3} size={20} />
            <span>Testes automatizados. O que fortalecer para a próxima: cobrir a paginação vazia.</span>
          </li>
        </ol>
      </div>
      <aside className="tx-validation__side">
        <Avatar name="Carla Dias" size="lg" />
        <div>
          <strong>Carla Dias</strong>
          validadora de Back-end
        </div>
        <p>Declarou não ter conflito de interesse com a Ana.</p>
        <p>Imutável. Uma correção vira um novo registro.</p>
      </aside>
    </article>
  )
}

/** The project as a result: GitHub data in mono, languages in neutral tones, never stars or forks. */
export function RepoPreview() {
  const langs = [
    { name: 'PHP', pct: 78 },
    { name: 'Blade', pct: 17 },
    { name: 'Outras', pct: 5 },
  ]
  return (
    <a className="tx-repo" href="https://github.com/danielhe4rt/agenda-de-lives" target="_blank" rel="noreferrer">
      <span className="tx-repo__head">
        <span>
          <h4>Agenda de lives</h4>
          <span className="tx-mono" style={{ color: 'var(--meta)' }}>
            danielhe4rt/agenda-de-lives
          </span>
        </span>
        <span className="tx-label" style={{ color: 'var(--roxo-texto)' }}>
          Abrir no GitHub
        </span>
      </span>
      <span className="tx-repo__langs" aria-hidden>
        {langs.map((l) => (
          <span key={l.name} style={{ width: `${l.pct}%` }} />
        ))}
      </span>
      <span className="tx-repo__legend">
        {langs.map((l) => (
          <span key={l.name}>
            {l.name} {l.pct}%
          </span>
        ))}
      </span>
      <span className="tx-repo__data">
        <span>
          <GitMerge strokeWidth={1.75} aria-hidden />
          12 PRs integrados
        </span>
        <span>
          <GitBranch strokeWidth={1.75} aria-hidden />
          último commit há 2 dias
        </span>
        <span>3 pessoas contribuíram</span>
      </span>
    </a>
  )
}

const REACTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'helped', label: 'Isso me ajudou', icon: Lightbulb },
  { id: 'learning-too', label: 'Aprendendo também', icon: UsersRound },
  { id: 'want-to-learn', label: 'Quero aprender', icon: Target },
  { id: 'inspiring', label: 'Inspirador', icon: Flame },
]

/** A dark label on hover and on keyboard focus, rendered in place so it keeps the page's tokens. */
function Tip({
  label,
  children,
  ...root
}: { label: string; children: ReactNode } & Pick<ComponentProps<typeof Tooltip.Root>, 'open' | 'onOpenChange'>) {
  return (
    <Tooltip.Root {...root}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Content className="tx-tip" side="top" sideOffset={6}>
        {label}
        <Tooltip.Arrow className="tx-tip__arrow" width={10} height={5} />
      </Tooltip.Content>
    </Tooltip.Root>
  )
}

/**
 * Reacting to a publication: one button opens the four reactions; the ones already given sit beside it
 * with their count, and clicking one takes yours back or adds it.
 */
export function Reactions({
  value,
  onChange,
  others = {},
  counts = true,
}: {
  value: string[]
  onChange: (value: string[]) => void
  others?: Record<string, number>
  /** Off when the author keeps the numbers to themselves: the pills show only which reactions were given. */
  counts?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [addTip, setAddTip] = useState(false)
  // Closing the menu returns focus to the add button; that focus should not pop its label.
  const returningFocus = useRef(false)
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  return (
    <Tooltip.Provider delayDuration={150} disableHoverableContent>
      <div className="tx-react" role="group" aria-label="Reações">
        {REACTIONS.filter((r) => value.includes(r.id) || others[r.id]).map((r) => {
          const mine = value.includes(r.id)
          const count = (others[r.id] ?? 0) + (mine ? 1 : 0)
          return (
            <Tip key={r.id} label={r.label}>
              <button
                type="button"
                className="tx-react__given"
                aria-pressed={mine}
                aria-label={counts ? `${r.label}: ${count}` : r.label}
                onClick={() => toggle(r.id)}
              >
                <r.icon strokeWidth={1.75} aria-hidden />
                {counts && <span>{count}</span>}
              </button>
            </Tip>
          )
        })}
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Tip
            label="Reagir"
            open={addTip && !open}
            onOpenChange={(next) => {
              if (next && returningFocus.current) {
                returningFocus.current = false
                return
              }
              setAddTip(next)
            }}
          >
            <Popover.Trigger className="tx-react__add" aria-label="Reagir">
              <SmilePlus strokeWidth={1.75} aria-hidden />
            </Popover.Trigger>
          </Tip>
          <Popover.Content
            className="tx-react__menu"
            side="top"
            align="start"
            sideOffset={8}
            aria-label="Escolha uma reação"
            tabIndex={-1}
            // Focus the menu itself, so opening it does not pop the first option's label.
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              ;(event.currentTarget as HTMLElement).focus()
            }}
            onCloseAutoFocus={() => {
              returningFocus.current = true
            }}
          >
            {REACTIONS.map((r, i) => (
              <Tip key={r.id} label={r.label}>
                <button
                  type="button"
                  className="tx-react__option"
                  style={{ '--i': i } as CSSProperties}
                  aria-pressed={value.includes(r.id)}
                  aria-label={r.label}
                  onClick={() => {
                    toggle(r.id)
                    setOpen(false)
                  }}
                >
                  <r.icon strokeWidth={1.75} aria-hidden />
                </button>
              </Tip>
            ))}
          </Popover.Content>
        </Popover.Root>
      </div>
    </Tooltip.Provider>
  )
}

const POSTS = {
  project: { verb: 'publicou um projeto', others: {} as Record<string, number>, mine: ['helped'] },
  learning: { verb: 'registrou um aprendizado', others: { helped: 3, 'learning-too': 2 } as Record<string, number>, mine: ['helped'] },
}

/** A Feed publication: the story in Geist, then what it produced (the repository, or progress toward the goal). */
export function Publication({ kind }: { kind: 'project' | 'learning' }) {
  const post = POSTS[kind]
  const [mine, setMine] = useState<string[]>(post.mine)
  const [saved, setSaved] = useState(false)
  return (
    <article className="tx-pub">
      <header className="tx-pub__who">
        <span className="tx-pub__avatar" aria-hidden>
          AS
        </span>
        <p>
          <span>
            <b>Ana Souza</b> {post.verb}
          </span>
          <span className="tx-meta">
            Há 2 horas, editado. <Eye strokeWidth={1.75} aria-label="Visível para a comunidade" />
          </span>
        </p>
      </header>

      <div className="tx-pub__body">
        {kind === 'project' ? (
          <>
            <div className="tx-pub__trail">
              <p className="tx-pub__text">
                Um catálogo do acervo da biblioteca do meu bairro. Comecei porque a lista era uma planilha que só uma
                pessoa sabia atualizar.
              </p>
              <p className="tx-pub__ref">
                <MessagesSquare strokeWidth={1.75} aria-hidden />
                Pediu ajuda no Fórum: <a href="#forum">Como paginar uma listagem grande?</a>
              </p>
            </div>
            <a className="tx-pub__repo" href="https://github.com/anasouza/acervo" target="_blank" rel="noreferrer">
              <span className="tx-pub__repo-name">
                <GitBranch strokeWidth={1.75} aria-hidden />
                anasouza/acervo
                <ExternalLink strokeWidth={1.75} aria-label="Abre no GitHub" />
              </span>
              <span>Catálogo do acervo comunitário com busca por autor e tema.</span>
              <span className="tx-meta">PHP, atualizado há 3 dias.</span>
            </a>
          </>
        ) : (
          <>
            <div className="tx-pub__trail">
              <div>
                <span className="tx-pub__label">O que aprendi</span>
                <p className="tx-pub__text">
                  A ordem das colunas num índice composto muda tudo. O banco só usa o índice da esquerda para a direita.
                </p>
              </div>
              <div>
                <span className="tx-pub__label">Como apliquei</span>
                <p className="tx-pub__text">
                  Inverti as colunas do índice do acervo para seguir a consulta mais comum. A listagem caiu de 2,1 s
                  para 40 ms.
                </p>
              </div>
              <div className="tx-row">
                <Chip>Banco de dados</Chip>
                <Chip>Back-end</Chip>
              </div>
            </div>
            <p className="tx-pub__goal">
              <b>Aproximou bastante</b> do objetivo de conseguir trabalho
            </p>
          </>
        )}
      </div>

      <footer className="tx-pub__actions">
        <Reactions value={mine} onChange={setMine} others={post.others} />
        <Button variant="tertiary">
          <MessageCircle strokeWidth={1.75} aria-hidden />
          Comentar (3)
        </Button>
        <Button variant="tertiary" pressed={saved} aria-pressed={saved} onClick={() => setSaved((s) => !s)}>
          <Bookmark strokeWidth={1.75} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          {saved ? 'Salva' : 'Salvar'}
        </Button>
      </footer>
    </article>
  )
}

/** A milestone with a name and a date. No rarity, no count, never unlocks anything. */
export function Achievement({ name, date, text }: { name: string; date: string; text: string }) {
  return (
    <div className="tx-ach">
      <Node kind="validated" />
      <p>
        <b>{name}</b>
        <span className="tx-meta">
          {text} {date}.
        </span>
      </p>
    </div>
  )
}
