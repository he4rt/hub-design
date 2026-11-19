import { Card } from '@/components/ui/card'
import './readme-card.css'

/** The member's "Sobre", first in the overview, in their own words. */
export function ReadmeCard({ readme, empty }: { readme: string | null; empty: string }) {
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
    </Card>
  )
}
