import { Link } from 'react-router'
import { ExternalLink } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { activityGroupLabels, type ActivityGroup, type ActivityItem } from '../lib/activity'
import './activity-list.css'

const GROUPS = Object.keys(activityGroupLabels) as ActivityGroup[]

/** What the member did, by date, filtered by kind. No likes, views, or popularity order. */
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
        <ol className="activity-list__items">
          {shown.map((item) => (
            <li key={item.id} className="activity-list__item">
              <time dateTime={item.date}>{item.dateLabel}</time>
              <span className="activity-list__kind">{item.kind}</span>
              <div className="activity-list__text">
                {item.href === null ? (
                  <span title={item.title}>{item.title}</span>
                ) : item.external ? (
                  <a href={item.href} target="_blank" rel="noreferrer" title={item.title}>
                    {item.title}
                    <ExternalLink size={12} aria-hidden />
                  </a>
                ) : (
                  <Link to={item.href} title={item.title}>
                    {item.title}
                  </Link>
                )}
                {item.note && <p title={item.note}>{item.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
      {!signedIn && group !== 'forum' && (
        <p className="activity-list__hint">A atividade no fórum aparece só para quem entrou no Hub.</p>
      )}
    </div>
  )
}
