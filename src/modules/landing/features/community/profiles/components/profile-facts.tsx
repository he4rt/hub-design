import { Badge } from '@/components/ui/badge'
import './profile-facts.css'

/**
 * The side column's facts about the member: their areas in lilac, the only purple chips beside
 * competencies, then what they do now, the technologies and the languages they speak.
 */
export function ProfileFacts({
  areas,
  currentRole,
  technologies,
  languages,
}: {
  areas: string[]
  currentRole: string | null
  technologies: string[]
  languages: string[]
}) {
  if (areas.length === 0 && !currentRole && technologies.length === 0 && languages.length === 0) return null
  return (
    <dl className="profile-facts">
      {areas.length > 0 && (
        <div>
          <dt>Áreas</dt>
          <dd className="profile-facts__chips">
            {areas.map((area) => (
              <Badge key={area} variant="comp">
                {area}
              </Badge>
            ))}
          </dd>
        </div>
      )}
      {currentRole && (
        <div>
          <dt>Atuação atual</dt>
          <dd title={currentRole}>{currentRole}</dd>
        </div>
      )}
      {technologies.length > 0 && (
        <div>
          <dt>Tecnologias</dt>
          <dd className="profile-facts__chips">
            {technologies.map((technology) => (
              <Badge key={technology} variant="tag">
                {technology}
              </Badge>
            ))}
          </dd>
        </div>
      )}
      {languages.length > 0 && (
        <div>
          <dt>Idiomas</dt>
          <dd>{languages.join(', ')}</dd>
        </div>
      )}
    </dl>
  )
}
