import { useActionState, useRef, useState } from 'react'
import { FormMessage } from '@/components/form-message'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDebugActions } from '@/debug/use-debug-actions'
import { SITUATIONS } from '@/lib/member-profile'
import type { Situation, User } from '@/mocks/db'
import { errorMessage, MockError } from '@/mocks/mock-action'
import { MUNICIPALITIES } from '@/mocks/municipalities'
import {
  AreasField,
  LanguagesField,
  ObjectiveField,
  StartingPointField,
} from '@/modules/panel-app/components/dev-profile-fields'
import { BIO_MAX_LENGTH, updateMemberProfile, type MemberProfileInput } from '../actions'
import './member-profile-form.css'

const CITY_OPTIONS = MUNICIPALITIES.map((city) => ({ value: `${city.uf}/${city.name}`, label: `${city.name}, ${city.uf}` }))
const PHOTO_SIZE = 192

/** Crops the picture to a square and shrinks it before it goes to the action. */
async function readPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = PHOTO_SIZE
  canvas.height = PHOTO_SIZE
  canvas
    .getContext('2d')
    ?.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE)
  return canvas.toDataURL('image/jpeg', 0.85)
}

type Result = { ok: true } | { ok: false; error: string; field?: string } | null

/** Profile questions, about you and the portfolio link. */
export function MemberProfileForm({ account }: { account: User }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [draft, setDraft] = useState<MemberProfileInput>({
    objective: account.objective,
    areas: account.areas,
    startingPoint: account.startingPoint,
    languages: account.languages,
    situation: account.situation,
    openToOpportunities: account.openToOpportunities,
    city: account.city,
    photoUrl: account.photoUrl,
    bio: account.bio,
    portfolioUrl: account.portfolioUrl,
  })

  function update(patch: Partial<MemberProfileInput>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  const [result, submit, pending] = useActionState(async (): Promise<Result> => {
    try {
      await updateMemberProfile(account.id, draft)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: errorMessage(e), field: e instanceof MockError ? e.field : undefined }
    }
  }, null)

  useDebugActions('Perfil', [
    {
      label: 'Preencher tudo',
      run: () =>
        update({
          areas: draft.areas.length ? draft.areas : ['back-end'],
          startingPoint: 'junior',
          languages: draft.languages.length ? draft.languages : ['PHP'],
          situation: 'seeking',
          openToOpportunities: true,
          city: { name: 'Curitiba', uf: 'PR' },
          bio: 'Back-end curioso, aprendendo em público.',
          portfolioUrl: 'https://exemplo.dev',
          photoUrl:
            'data:image/svg+xml;base64,' +
            btoa('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#7c3aed"/></svg>'),
        }),
    },
    { label: 'Portfólio inválido (erro esperado)', run: () => update({ portfolioUrl: 'meusite' }) },
  ])

  const invalid = (field: string) => (result?.ok === false && result.field === field ? true : undefined)

  return (
    <form action={submit} className="member-profile">
      <Card>
        <h2 className="member-profile__title">Perfil dev</h2>
        <fieldset className="member-profile__group">
          <legend>Objetivo</legend>
          <ObjectiveField value={draft.objective} onChange={(objective) => update({ objective })} />
        </fieldset>
        <fieldset className="member-profile__group">
          <legend>Áreas</legend>
          <AreasField value={draft.areas} onChange={(areas) => update({ areas })} invalid={invalid('areas')} />
        </fieldset>
        <fieldset className="member-profile__group">
          <legend>Ponto de partida</legend>
          <p className="member-profile__hint">Privado: só você vê.</p>
          <StartingPointField value={draft.startingPoint} onChange={(startingPoint) => update({ startingPoint })} />
        </fieldset>
        <fieldset className="member-profile__group">
          <legend>Linguagens</legend>
          <LanguagesField value={draft.languages} onChange={(languages) => update({ languages })} />
        </fieldset>
      </Card>

      <Card>
        <h2 className="member-profile__title">Sobre você</h2>

        <div className="member-profile__photo">
          <Avatar src={draft.photoUrl} name={account.name} size="xl" />
          <div className="member-profile__photo-actions">
            <Button type="button" variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
              Enviar foto
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={draft.photoUrl === null}
              onClick={() => update({ photoUrl: null })}
            >
              Remover
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              aria-label="Foto"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                try {
                  update({ photoUrl: await readPhoto(file) })
                  setPhotoError(null)
                } catch {
                  setPhotoError('Não foi possível ler esta imagem.')
                }
              }}
            />
          </div>
        </div>
        <FormMessage tone="error">{photoError}</FormMessage>

        <div className="member-profile__field">
          <div className="member-profile__label-row">
            <Label htmlFor="bio">Bio</Label>
            <span className="member-profile__count">
              {draft.bio.length}/{BIO_MAX_LENGTH}
            </span>
          </div>
          <Textarea
            id="bio"
            maxLength={BIO_MAX_LENGTH}
            value={draft.bio}
            aria-invalid={invalid('bio')}
            placeholder="O que você faz, estuda ou quer construir."
            onChange={(e) => update({ bio: e.target.value })}
          />
        </div>

        <div className="member-profile__city">
          <div className="member-profile__field">
            <Label htmlFor="city">Cidade</Label>
            <Combobox
              id="city"
              placeholder="Digite sua cidade"
              options={CITY_OPTIONS}
              value={draft.city ? `${draft.city.uf}/${draft.city.name}` : null}
              onValueChange={(value) => {
                const [uf, name] = value?.split('/') ?? []
                update({ city: value ? { name, uf } : null })
              }}
              emptyText="Nenhuma cidade encontrada."
              aria-invalid={invalid('city')}
            />
          </div>
          <div className="member-profile__field">
            <span className="member-profile__label">Estado</span>
            <p className="member-profile__readonly" aria-live="polite">
              {draft.city?.uf ?? '—'}
            </p>
          </div>
        </div>

        <fieldset className="member-profile__group">
          <legend>Situação</legend>
          <ToggleGroup
            type="single"
            variant="chips"
            value={draft.situation ?? ''}
            onValueChange={(situation) => update({ situation: (situation || null) as Situation | null })}
            aria-label="Situação"
          >
            {SITUATIONS.map((situation) => (
              <ToggleGroupItem key={situation.value} value={situation.value}>
                {situation.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="member-profile__switch">
            <Switch
              id="open-to-opportunities"
              checked={draft.openToOpportunities}
              onCheckedChange={(openToOpportunities) => update({ openToOpportunities })}
            />
            <Label htmlFor="open-to-opportunities">Aberto a oportunidades</Label>
          </div>
          <p className="member-profile__hint">Só a administração vê esta opção; ela não aparece no perfil.</p>
        </fieldset>

        <div className="member-profile__field">
          <Label htmlFor="portfolio">Portfólio</Label>
          <Input
            id="portfolio"
            type="url"
            placeholder="https://seusite.dev"
            value={draft.portfolioUrl}
            aria-invalid={invalid('portfolio')}
            onChange={(e) => update({ portfolioUrl: e.target.value })}
          />
        </div>
      </Card>

      <div className="member-profile__submit">
        <FormMessage tone={result?.ok === false ? 'error' : 'success'}>
          {result && (result.ok ? 'Perfil salvo.' : result.error)}
        </FormMessage>
        <Button type="submit" loading={pending}>
          Salvar perfil
        </Button>
      </div>
    </form>
  )
}
