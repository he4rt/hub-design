import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { Link } from 'react-router'
import { useDebugActions } from '@/debug/use-debug-actions'
import { emptyProfile, recordTypeLabels, recordTypes, trajectoryGraph, type RecordType } from '@/lib/trajectory/graph'
import { visibilityOptions } from '@/lib/trajectory/visibility'
import { useDb } from '@/mocks/db'
import { AppShell } from './app-shell'
import { Marker } from './graph'
import { Button, Chip, More, Node } from './parts'
import { malhaStore, useLabParams } from './theme'
import './profile.css'

const PAGE = 8

/** What "Novo registro" can add; each form lives in Editar perfil, in /app. */
const NEW_RECORDS = [
  { label: 'Conhecimento', hint: 'Uma competência que você já tem, com o nível.' },
  { label: 'Aprendizagem', hint: 'Um curso, um estudo ou um artigo que você leu.' },
  { label: 'Experiência', hint: 'Um trabalho fora do Hub.' },
  { label: 'Artigo', hint: 'Um texto seu publicado no dev.to.' },
  { label: 'Evidência técnica', hint: 'Um commit, pull request ou repositório do GitHub.' },
]

const visibilityLabel = Object.fromEntries(visibilityOptions.map((o) => [o.value, o.label]))

/**
 * The trajectory screen, the sidebar's "Trajetória": where the member manages their records, apart
 * from the profile that shows them. Records the Hub writes (demonstrated and validated) are listed
 * but not edited. Nothing here writes: "Novo registro" and "Editar" open the forms in /app.
 */
export default function Trajectory() {
  const state = useDb((s) => s)
  const [params, setParams] = useLabParams()
  const [adding, setAdding] = useState(false)
  const [empty, setEmpty] = useState(false)
  const limit = Math.max(PAGE, Number(params.get('limite')) || PAGE)
  const tipo = params.get('tipo') as RecordType | null
  const type = recordTypes.some((t) => t.value === tipo) ? tipo : null

  useDebugActions('Trajetória (Técnico × Traçado)', [
    { label: 'Tema claro', run: () => malhaStore.set(() => ({ theme: 'light' })) },
    { label: 'Tema escuro', run: () => malhaStore.set(() => ({ theme: 'dark' })) },
    { label: empty ? 'Mostrar os registros' : 'Ver a trajetória vazia', run: () => setEmpty((e) => !e) },
    { label: 'Novo registro', run: () => setAdding(true) },
  ])

  return (
    <AppShell screen="trajectory" path="/design-lab/trajetoria">
      {(account, root) => {
        const profile = state.profiles.find((p) => p.userId === account.id) ?? emptyProfile(account.id)
        const graph = trajectoryGraph(profile, { ...state, viewer: 'owner' })
        // Records only: joining or leaving a squad is a branch of the line, not something to manage.
        const records = empty ? [] : graph.entries.filter((e) => e.type !== null)
        const shown = records.filter((e) => !type || e.type === type)
        const types = recordTypes.filter((t) => records.some((e) => e.type === t.value))

        return (
          <main className="txf-main" data-single data-wide>
            <header className="txf-head">
              <div>
                <h1>Trajetória</h1>
                <p>Seus registros, do mais recente ao mais antigo. Escolha quem vê cada um.</p>
              </div>
              <div className="txf-head__actions">
                <Button asChild>
                  <Link viewTransition to="/design-lab/perfil?aba=trajetoria">Ver no perfil</Link>
                </Button>
                <Button variant="primary" onClick={() => setAdding(true)}>
                  <Plus strokeWidth={1.75} aria-hidden />
                  Novo registro
                </Button>
              </div>
            </header>

            <div className="txf-body">
              <div className="txf-column txp-sections">
                {records.length === 0 ? (
                  <div className="tx-empty">
                    <div className="tx-empty__path" aria-hidden>
                      <Node kind="current" />
                      <i />
                      <Node kind="future" />
                      <i />
                      <Node kind="future" />
                    </div>
                    <div>
                      <p className="tx-empty__title">Sua trajetória ainda não tem registros</p>
                      <p className="tx-empty__text">Comece pelo que você já sabe: um conhecimento, um curso, um trabalho.</p>
                      <Button onClick={() => setAdding(true)}>Novo registro</Button>
                    </div>
                  </div>
                ) : (
                  <section className="txp-section" aria-label="Registros">
                    <div className="txp-filter" role="group" aria-label="Tipo de registro">
                      {([null, ...types.map((t) => t.value)] as (RecordType | null)[]).map((value) => (
                        <button
                          key={value ?? 'all'}
                          type="button"
                          className="txp-filter__item"
                          aria-pressed={type === value}
                          onClick={() => setParams(value ? { tipo: value } : {})}
                        >
                          {value ? recordTypeLabels[value] : 'Tudo'}
                        </button>
                      ))}
                    </div>
                    <ol className="txt-records">
                      {shown.slice(0, limit).map((entry) => (
                        <li key={entry.id} className="txt-record">
                          <svg width={18} height={18} aria-hidden>
                            <Marker type={entry.type} x={9} y={9} lane={0} tone={entry.type === 'validated' ? 'validation' : 'main'} />
                          </svg>
                          <div className="txt-record__text">
                            <p className="txt-record__title" title={entry.title}>
                              {entry.title}
                            </p>
                            <p className="tx-meta">
                              {entry.type && recordTypeLabels[entry.type]}, {entry.dateLabel}
                            </p>
                          </div>
                          {entry.record ? (
                            <span className="txt-record__actions">
                              <Chip tone="neutral">{visibilityLabel[entry.record.visibility]}</Chip>
                              <Button variant="tertiary" size="compact" asChild>
                                <Link viewTransition to="/app/settings/profile">Editar</Link>
                              </Button>
                            </span>
                          ) : (
                            <span className="tx-meta txt-record__hub" title={entry.origin}>
                              {entry.origin.startsWith('Publicação do diário') ? 'Do diário' : 'Registrado pelo Hub'}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                    <More
                      total={shown.length}
                      limit={limit}
                      onMore={() =>
                        setParams(
                          (current) => {
                            current.set('limite', String(limit + PAGE))
                            return current
                          },
                          { preventScrollReset: true },
                        )
                      }
                    />
                  </section>
                )}
              </div>
            </div>

            <Dialog.Root open={adding} onOpenChange={setAdding}>
              <Dialog.Portal container={root}>
                <Dialog.Overlay className="tx-scrim" />
                <Dialog.Content className="tx-dialog">
                  <header className="tx-dialog__head">
                    <Dialog.Title className="tx-dialog__title">Novo registro</Dialog.Title>
                    <Dialog.Description className="tx-dialog__desc">O que você quer registrar na trajetória?</Dialog.Description>
                  </header>
                  <ul className="tx-dialog__body txt-new">
                    {NEW_RECORDS.map((option) => (
                      <li key={option.label}>
                        <Link viewTransition to="/app/settings/profile" className="txt-new__item">
                          <b>{option.label}</b>
                          <span className="tx-meta">{option.hint}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <footer className="tx-dialog__foot">
                    <span className="tx-meta">Commits, entregas e validações entram sozinhos.</span>
                    <Dialog.Close asChild>
                      <Button>Cancelar</Button>
                    </Dialog.Close>
                  </footer>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </main>
        )
      }}
    </AppShell>
  )
}
