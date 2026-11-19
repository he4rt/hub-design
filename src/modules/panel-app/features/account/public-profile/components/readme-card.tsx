import { FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import './readme-card.css'

/** The member's "Sobre", first in the overview, in their own words. */
export function ReadmeCard({ readme, empty }: { readme: string | null; empty: string }) {
  return (
    <Card className="readme-card" aria-labelledby="readme-card-title">
      <h2 id="readme-card-title" className="readme-card__title">
        <FileText size={16} aria-hidden />
        Sobre
      </h2>
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
