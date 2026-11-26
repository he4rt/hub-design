import { useState } from 'react'
import { EyeOff } from 'lucide-react'
import { Dialog, Popover } from 'radix-ui'
import { formatMonth } from '@/lib/dates'
import { achievementCatalog, type AchievementDefinition, type AchievementGroup } from '@/mocks/achievements'
import type { MemberAchievement } from '@/mocks/db'
import { Button } from './parts'
import './achievements.css'

/** Medals shown in the side column before "Ver todas". */
const SHOWN = 8

const STAGES: Record<string, string> = {
  member: 'Membro',
  prepared: 'Preparado',
  practicing: 'Praticante',
  delivered: 'Com entrega',
  validated: 'Validado',
}

const GROUPS: Record<AchievementGroup, string> = {
  arrival: 'Chegada e identidade',
  trajectory: 'Trajetória',
  diary: 'Diário',
  'entry-test': 'Teste de entrada',
  squads: 'Squads',
  validation: 'Validação',
  community: 'Contribuição para a comunidade',
  tenure: 'Tempo de casa',
  market: 'Mercado',
  manual: 'Concedidas pela administração',
}

type Medal = { achievement: MemberAchievement; definition: AchievementDefinition; shown: boolean; blocked: boolean }

/**
 * The achievements block in "Técnico × Traçado": the journey stage, then the latest marks as quiet
 * circles with a short glyph. The owner sees every one; a hidden one is dashed with a crossed eye.
 * Showing or hiding stays on this screen: nothing writes.
 */
export function Achievements({
  achievements,
  stage,
  root,
}: {
  achievements: MemberAchievement[]
  stage: string
  /** Where the dialog mounts, to keep the lab's tokens. */
  root: HTMLElement | null
}) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const medals: Medal[] = achievementCatalog.flatMap((definition) => {
    const achievement = achievements.find((a) => a.key === definition.key && a.revokedAt === null)
    if (!achievement) return []
    const blocked = definition.private && !achievement.originPublic
    const shown = !blocked && (hidden[achievement.key] ?? !achievement.isPublic) === false
    return [{ achievement, definition, shown, blocked }]
  })
  const recent = medals.toSorted((a, b) => b.achievement.unlockedAt.localeCompare(a.achievement.unlockedAt))
  const toggle = (medal: Medal) => setHidden((h) => ({ ...h, [medal.achievement.key]: medal.shown }))

  return (
    <section className="txa" aria-labelledby="txa-title">
      <header className="txa__head">
        <h4 id="txa-title">Conquistas</h4>
        {medals.length > SHOWN && <AllAchievements medals={medals} onToggle={toggle} root={root} />}
      </header>
      <p className="txa__stage">
        Jornada: <b>{STAGES[stage]}</b>.
      </p>
      {recent.length === 0 ? (
        <p className="tx-meta">Suas conquistas aparecem aqui conforme você avança.</p>
      ) : (
        <ul className="txa__grid">
          {recent.slice(0, SHOWN).map((medal) => (
            <li key={medal.achievement.id}>
              <MedalButton medal={medal} onToggle={toggle} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** One achievement as a circle; a tap opens what it means, when it happened and who sees it. */
function MedalButton({ medal, onToggle }: { medal: Medal; onToggle: (medal: Medal) => void }) {
  const { achievement, definition, shown, blocked } = medal
  const manual = achievement.source === 'administration'
  return (
    <Popover.Root>
      <Popover.Trigger
        className="txa-medal"
        data-hidden={shown ? undefined : ''}
        aria-label={`${definition.name}${shown ? '' : ' (oculta do perfil)'}`}
        title={definition.name}
      >
        <span className="txa-medal__glyph" aria-hidden>
          {definition.glyph}
        </span>
        {!shown && <EyeOff className="txa-medal__eye" strokeWidth={2} aria-hidden />}
      </Popover.Trigger>
      <Popover.Content className="txa-pop" side="bottom" align="center" sideOffset={8} collisionPadding={16}>
        <p className="txa-pop__name">{definition.name}</p>
        <p className="txa-pop__text">{definition.description}</p>
        <p className="tx-meta">
          {manual ? 'Concedida pela administração' : 'Apurada pela plataforma'} em {formatMonth(achievement.unlockedAt)}.
        </p>
        {!shown && (
          <p className="txa-pop__note">
            <EyeOff strokeWidth={1.75} aria-hidden />
            {blocked
              ? 'Ela vem de um registro privado e aparece no perfil quando você publicar esse registro.'
              : 'Você ocultou esta conquista do seu perfil.'}
          </p>
        )}
        <Button size="compact" disabled={blocked} onClick={() => onToggle(medal)}>
          {shown ? 'Esconder do perfil' : 'Mostrar no perfil'}
        </Button>
      </Popover.Content>
    </Popover.Root>
  )
}

/** "Ver todas": every achievement by catalog group, in a dialog that scrolls inside the viewport. */
function AllAchievements({ medals, onToggle, root }: { medals: Medal[]; onToggle: (medal: Medal) => void; root: HTMLElement | null }) {
  const groups = (Object.keys(GROUPS) as AchievementGroup[])
    .map((group) => ({ group, items: medals.filter((m) => m.definition.group === group) }))
    .filter((g) => g.items.length > 0)
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="tertiary" size="compact">
          Ver todas
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal container={root}>
        <Dialog.Overlay className="tx-scrim" />
        <Dialog.Content className="tx-dialog">
          <header className="tx-dialog__head">
            <Dialog.Title className="tx-dialog__title">Suas conquistas</Dialog.Title>
            <Dialog.Description className="tx-dialog__desc">
              Reconhecimento pelo que aconteceu no Hub. Não mede ninguém nem libera acesso.
            </Dialog.Description>
          </header>
          <div className="tx-dialog__body">
            {groups.map(({ group, items }) => (
              <section key={group} className="txa-group" aria-labelledby={`txa-${group}`}>
                <h3 id={`txa-${group}`}>{GROUPS[group]}</h3>
                <ul>
                  {items.map((medal) => (
                    <li key={medal.achievement.id} className="txa-row">
                      <MedalButton medal={medal} onToggle={onToggle} />
                      <div className="txa-row__text">
                        <b title={medal.definition.name}>{medal.definition.name}</b>
                        <span>{medal.definition.description}</span>
                        {!medal.shown && <span className="txa-row__private">Oculta do perfil</span>}
                      </div>
                      <time className="tx-meta" dateTime={medal.achievement.unlockedAt}>
                        {formatMonth(medal.achievement.unlockedAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <footer className="tx-dialog__foot">
            <span className="tx-meta">Mostrar ou esconder não grava nada nesta tela.</span>
            <Dialog.Close asChild>
              <Button>Fechar</Button>
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
