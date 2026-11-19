import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { ContributionFact } from '../lib/activity'
import './contribution-facts.css'

/**
 * One count per kind of contribution, each opening the list it counts in the Atividade tab.
 * First in the overview, in large numbers. Never summed into a reputation, and a zero is never shown.
 */
export function ContributionFacts({ facts }: { facts: ContributionFact[] }) {
  return (
    <Card className="contribution-facts" aria-labelledby="contribution-facts-title">
      <h2 id="contribution-facts-title" className="contribution-facts__heading">
        Contribuição
      </h2>
      <ul className="contribution-facts__list">
        {facts.map((fact) => (
          <li key={fact.id} className="contribution-facts__item" data-group={fact.group}>
            <strong>{fact.value}</strong>
            {/* The link covers the whole tile. */}
            <Link to={`?aba=atividade&tipo=${fact.group}`}>{fact.label}</Link>
            <ArrowUpRight size={14} aria-hidden className="contribution-facts__arrow" />
          </li>
        ))}
      </ul>
    </Card>
  )
}
