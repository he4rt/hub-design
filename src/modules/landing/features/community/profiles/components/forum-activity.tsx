import { Link, useSearchParams } from 'react-router'
import { CircleCheck, CircleHelp, MessageSquareReply } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ForumItem } from '../lib/activity'
import './forum-activity.css'

const KINDS = [
  { value: 'all', label: 'Tudo' },
  { value: 'Pergunta', label: 'Perguntas' },
  { value: 'Resposta', label: 'Respostas' },
] as const

/**
 * The member's questions and answers in the forum, newest first, as a list of rows that open the
 * discussion. A filter splits questions from answers; an answer the author marked solves it, quietly.
 */
export function ForumActivity({ items, firstName, isOwner }: { items: ForumItem[]; firstName: string; isOwner: boolean }) {
  const [params, setParams] = useSearchParams()
  const kind = KINDS.find((option) => option.value === params.get('forum'))?.value ?? 'all'
  if (items.length === 0) {
    return (
      <p className="forum-activity__empty">
        {isOwner ? 'Suas perguntas e respostas no Fórum aparecem aqui.' : `${firstName} ainda não participou do Fórum.`}
      </p>
    )
  }
  const shown = kind === 'all' ? items : items.filter((item) => item.kind === kind)
  return (
    <div className="forum-activity">
      <ToggleGroup
        type="single"
        variant="chips"
        value={kind}
        aria-label="Filtrar o Fórum"
        onValueChange={(next) =>
          next &&
          setParams(
            (current) => {
              const result = new URLSearchParams(current)
              if (next === 'all') result.delete('forum')
              else result.set('forum', next)
              return result
            },
            { replace: true },
          )
        }
      >
        {KINDS.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {shown.length === 0 ? (
        <p className="forum-activity__empty">Nada aqui ainda.</p>
      ) : (
        <ul className="forum-activity__list">
          {shown.map((item) => {
            const Icon = item.kind === 'Pergunta' ? CircleHelp : MessageSquareReply
            return (
              <li key={item.id}>
                <Link to={item.href} className="forum-activity__row">
                  <Icon size={18} className="forum-activity__icon" aria-hidden />
                  <span className="forum-activity__text">
                    <span className="forum-activity__title" title={item.title}>
                      {item.title}
                    </span>
                    <span className="forum-activity__meta">
                      {item.kind === 'Pergunta' ? 'Perguntou' : 'Respondeu'}
                      {item.solved && (
                        <span className="forum-activity__solved">
                          <CircleCheck size={14} aria-hidden />
                          Solução
                        </span>
                      )}
                    </span>
                  </span>
                  <time dateTime={item.date} className="forum-activity__date">
                    {item.dateLabel}
                  </time>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
