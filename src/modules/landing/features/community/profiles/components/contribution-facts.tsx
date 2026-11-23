import { Fragment } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/card'
import type { ContributionFact } from '../lib/activity'
import './contribution-facts.css'

/**
 * One count per kind of contribution, said as a sentence, each part opening the tab that lists it
 * (Trajetória or Fórum). Never summed into a reputation, never a scoreboard, and a zero is never shown.
 */
export function ContributionFacts({ facts }: { facts: ContributionFact[] }) {
  return (
    <Card className="contribution-facts" aria-labelledby="contribution-facts-title">
      <h2 id="contribution-facts-title">Contribuição</h2>
      <p className="contribution-facts__sentence">
        {facts.map((fact, i) => (
          <Fragment key={fact.id}>
            {i > 0 && (i === facts.length - 1 ? ' e ' : ', ')}
            <Link to={`?aba=${fact.tab}`}>
              {fact.value} {fact.label}
            </Link>
          </Fragment>
        ))}
        .
      </p>
    </Card>
  )
}
