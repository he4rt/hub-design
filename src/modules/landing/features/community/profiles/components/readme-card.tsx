import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import './readme-card.css'

/** The member's "Sobre", first in the overview, in their own words; under it, one labeled row of chips per kind. */
export function ReadmeCard({ readme, empty, groups }: { readme: string | null; empty: string; groups: { label: string; items: string[] }[] }) {
  const shown = groups.filter((group) => group.items.length > 0)
  return (
    <Card className="readme-card" aria-labelledby="readme-card-title">
      <h2 id="readme-card-title">Sobre</h2>
      {readme ? (
        <div className="readme-card__body">
          {readme.split('\n\n').map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p className="readme-card__empty">{empty}</p>
      )}
      {shown.length > 0 && (
        <dl className="readme-card__groups">
          {shown.map((group) => (
            <div key={group.label} className="readme-card__group">
              <dt>{group.label}</dt>
              <dd>
                {group.items.map((item) => (
                  <Badge key={item}>{item}</Badge>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  )
}
