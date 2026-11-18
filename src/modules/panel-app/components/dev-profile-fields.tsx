import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { RadioCard, RadioCards } from '@/components/ui/radio-cards'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AREAS, LANGUAGES, LANGUAGES_MAX, OBJECTIVES, STARTING_POINTS } from '@/lib/member-profile'
import type { Area, Objective, StartingPoint } from '@/mocks/db'
import './dev-profile-fields.css'

/*
 * One component per profile question: the onboarding shows one per screen and
 * the profile page shows them all.
 */

export function ObjectiveField({
  value,
  onChange,
}: {
  value: Objective | null
  onChange: (objective: Objective) => void
}) {
  return (
    <div className="dev-profile-fields__group">
      {/* React resets the form after a submit; Radix answers with an empty value, which is never a real choice. */}
      <RadioCards
        value={value ?? ''}
        onValueChange={(objective) => objective && onChange(objective as Objective)}
        aria-label="Objetivo"
      >
        {OBJECTIVES.map((objective) => (
          <RadioCard
            key={objective.value}
            value={objective.value}
            label={objective.label}
            description={objective.description}
          />
        ))}
      </RadioCards>
      <p className="dev-profile-fields__notice" data-visible={value === 'learn' || value === 'get-job' || undefined}>
        {value === 'learn' && (
          <>
            Para estudar, a <a href="#basement">Basement</a> tem os cursos da comunidade.
          </>
        )}
        {value === 'get-job' && (
          <>
            Para se candidatar, o <a href="#job-finder">Job Finder</a> ajuda a preparar currículo e entrevistas.
          </>
        )}
      </p>
    </div>
  )
}

export function AreasField({
  value,
  onChange,
  invalid,
}: {
  value: Area[]
  onChange: (areas: Area[]) => void
  invalid?: boolean
}) {
  return (
    <div className="dev-profile-fields__group" data-invalid={(invalid && value.length === 0) || undefined}>
      <ToggleGroup
        type="multiple"
        variant="chips"
        value={value}
        onValueChange={(areas) => onChange(areas as Area[])}
        aria-label="Áreas"
      >
        {AREAS.map((area) => (
          <ToggleGroupItem key={area.value} value={area.value}>
            {area.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

export function StartingPointField({
  value,
  onChange,
}: {
  value: StartingPoint | null
  onChange: (startingPoint: StartingPoint | null) => void
}) {
  return (
    <div className="dev-profile-fields__group">
      <ToggleGroup
        type="single"
        variant="chips"
        value={value ?? ''}
        onValueChange={(startingPoint) => onChange((startingPoint || null) as StartingPoint | null)}
        aria-label="Ponto de partida"
      >
        {STARTING_POINTS.map((point) => (
          <ToggleGroupItem key={point.value} value={point.value}>
            {point.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

export function LanguagesField({ value, onChange }: { value: string[]; onChange: (languages: string[]) => void }) {
  const [query, setQuery] = useState('')
  const full = value.length >= LANGUAGES_MAX
  const normalized = query.trim().toLowerCase()
  // Selected languages stay visible while searching.
  const languages = LANGUAGES.filter(
    (language) => value.includes(language) || language.toLowerCase().includes(normalized),
  )

  return (
    <div className="dev-profile-fields__group">
      <div className="dev-profile-fields__search">
        <Input
          type="search"
          placeholder="Buscar linguagem"
          aria-label="Buscar linguagem"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // Enter searches; it does not send the form.
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        />
        <span className="dev-profile-fields__count">
          {value.length} de {LANGUAGES_MAX}
        </span>
      </div>
      {languages.length === 0 ? (
        <p className="dev-profile-fields__hint">Nenhuma linguagem encontrada.</p>
      ) : (
        <ToggleGroup
          type="multiple"
          variant="chips"
          value={value}
          onValueChange={onChange}
          aria-label="Linguagens"
        >
          {languages.map((language) => (
            <ToggleGroupItem key={language} value={language} disabled={full && !value.includes(language)}>
              {language}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    </div>
  )
}
