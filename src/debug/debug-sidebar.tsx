import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useStore } from '@/lib/store'
import { db } from '@/mocks/db'
import { debugStore, type DebugLogEntry } from './debug-store'
import './debug-sidebar.css'

const LATENCIES = [0, 300, 1000, 3000]

function setOpen(open: boolean) {
  debugStore.set((state) => ({ ...state, open }))
}

/** Panel with the current screen's mock actions, simulation settings, and the action log. Toggle with Alt+D. */
export function DebugSidebar() {
  const open = useStore(debugStore, (s) => s.open)
  const groups = useStore(debugStore, (s) => s.groups)
  const latencyMs = useStore(debugStore, (s) => s.latencyMs)
  const failNext = useStore(debugStore, (s) => s.failNext)
  const log = useStore(debugStore, (s) => s.log)
  const { pathname } = useLocation()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey && event.code === 'KeyD') {
        event.preventDefault()
        setOpen(!debugStore.get().open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!open) {
    return (
      <Button className="debug-toggle" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Debug
      </Button>
    )
  }

  const groupList = Object.entries(groups)

  return (
    <aside className="debug-sidebar" aria-label="Debug">
      <header className="debug-sidebar__header">
        <div>
          <strong>Debug</strong>
          <code className="debug-sidebar__path">{pathname}</code>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} title="Fechar (Alt+D)">
          Fechar
        </Button>
      </header>

      <ScrollArea className="debug-sidebar__body">
        <section className="debug-sidebar__section">
          <h3>Ações da tela</h3>
          {groupList.length === 0 && <p className="debug-sidebar__empty">Nenhuma ação nesta tela.</p>}
          {groupList.map(([id, group]) => (
            <div key={id} className="debug-sidebar__group">
              <span className="debug-sidebar__group-title">{group.title}</span>
              {group.actions.map((action) => (
                <Button
                  key={action.label}
                  variant="secondary"
                  size="sm"
                  title={action.description}
                  onClick={() => void Promise.resolve(action.run()).catch(() => {})}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ))}
        </section>

        <section className="debug-sidebar__section">
          <h3>Simulação</h3>
          <div className="debug-sidebar__row">
            <Label>Latência</Label>
            <ToggleGroup
              type="single"
              value={String(latencyMs)}
              onValueChange={(value) =>
                value && debugStore.set((s) => ({ ...s, latencyMs: Number(value) }))
              }
            >
              {LATENCIES.map((ms) => (
                <ToggleGroupItem key={ms} value={String(ms)}>
                  {ms}ms
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="debug-sidebar__row">
            <Label htmlFor="debug-fail-next">Falhar próxima ação</Label>
            <Switch
              id="debug-fail-next"
              checked={failNext}
              onCheckedChange={(checked) => debugStore.set((s) => ({ ...s, failNext: checked }))}
            />
          </div>
          <Button variant="danger" size="sm" onClick={() => db.reset()}>
            Resetar dados mockados
          </Button>
        </section>

        <section className="debug-sidebar__section">
          <div className="debug-sidebar__row">
            <h3>Log de ações</h3>
            <Button variant="ghost" size="sm" onClick={() => debugStore.set((s) => ({ ...s, log: [] }))}>
              Limpar
            </Button>
          </div>
          {log.length === 0 && <p className="debug-sidebar__empty">Nenhuma ação executada.</p>}
          <ol className="debug-sidebar__log">
            {log.map((entry) => (
              <LogEntry key={entry.id} entry={entry} />
            ))}
          </ol>
        </section>
      </ScrollArea>
    </aside>
  )
}

function LogEntry({ entry }: { entry: DebugLogEntry }) {
  return (
    <li className="debug-log-entry" data-status={entry.status}>
      <details>
        <summary>
          <span className="debug-log-entry__status">{entry.status}</span>
          <code>{entry.name}</code>
          {entry.durationMs !== undefined && <span className="debug-log-entry__time">{entry.durationMs}ms</span>}
        </summary>
        <pre>{JSON.stringify({ input: entry.input, output: entry.output, error: entry.error }, null, 2)}</pre>
      </details>
    </li>
  )
}
