import { Link } from 'react-router'
import { ExternalLink } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TrailLog, TrailLogItem } from '@/components/ui/trail-log'
import { activityGroupLabels, type ActivityGroup, type ActivityItem } from '../lib/activity'
import './activity-list.css'

const GROUPS = Object.keys(activityGroupLabels) as ActivityGroup[]

/** The trail dot of each kind: an accepted delivery or a solution in success, joining a squad as a move. */
function toneOf(item: ActivityItem) {
  if (item.kind === 'Entrega aceita' || item.note === 'marcada como solução') return 'success'
  if (item.kind === 'Squad') return 'move'
  return 'past'
}

/** What the member did, by date, filtered by kind, as a trail. No likes, views, or popularity order. */
export function ActivityList({
  items,
  group,
  onGroupChange,
  signedIn,
}: {
  items: ActivityItem[]
  group: ActivityGroup | null
  onGroupChange: (group: ActivityGroup | null) => void
  signedIn: boolean
}) {
  const shown = group ? items.filter((item) => item.group === group) : items

  return (
    <div className="activity-list">
      <ToggleGroup
        type="single"
        aria-label="Tipo de atividade"
        value={group ?? 'all'}
        onValueChange={(value) => value && onGroupChange(value === 'all' ? null : (value as ActivityGroup))}
      >
        <ToggleGroupItem value="all">Tudo</ToggleGroupItem>
        {GROUPS.map((value) => (
          <ToggleGroupItem key={value} value={value}>
            {activityGroupLabels[value]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {shown.length === 0 ? (
        <p className="activity-list__empty">
          {group === 'forum' && !signedIn
            ? 'A atividade no fórum aparece só para quem entrou no Hub.'
            : 'Nada por aqui ainda.'}
        </p>
      ) : (
        <TrailLog className="activity-list__items">
          {shown.map((item) => (
            <TrailLogItem
              key={item.id}
              tone={toneOf(item)}
              title={
                item.href === null ? (
                  <span title={item.title}>{item.title}</span>
                ) : item.external ? (
                  <a href={item.href} target="_blank" rel="noreferrer" title={item.title}>
                    {item.title}
                    <ExternalLink size={12} aria-label="Abre no GitHub" />
                  </a>
                ) : (
                  <Link to={item.href} title={item.title}>
                    {item.title}
                  </Link>
                )
              }
              meta={
                <>
                  {item.kind}, <time dateTime={item.date}>{item.dateLabel}</time>
                </>
              }
            >
              {item.note && (
                <p className="activity-list__note" data-mono={item.external || undefined} title={item.note}>
                  {item.note}
                </p>
              )}
            </TrailLogItem>
          ))}
        </TrailLog>
      )}
      {!signedIn && group !== 'forum' && (
        <p className="activity-list__hint">A atividade no fórum aparece só para quem entrou no Hub.</p>
      )}
    </div>
  )
}
