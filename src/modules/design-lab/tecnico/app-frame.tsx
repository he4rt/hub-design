import { BadgeCheck, Bell, Flag, House, Inbox, MessagesSquare, PackageCheck, Search, UsersRound, type LucideIcon } from 'lucide-react'
import { MarcaHe4rt } from './marca'
import { Achievement, JourneyCompact, Publication } from './hub'
import { Avatar, Button, Count, Node, Steps, Tabs } from './parts'

type NavItem = { label: string; icon: LucideIcon; current?: boolean; count?: number }

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Trajetória',
    items: [
      { label: 'Início', icon: House, current: true },
      { label: 'Fórum', icon: MessagesSquare },
    ],
  },
  {
    label: 'Desenvolvimento',
    items: [
      { label: 'Squads', icon: UsersRound },
      { label: 'Meu squad', icon: Flag },
      { label: 'Minhas validações', icon: BadgeCheck },
    ],
  },
  {
    label: 'Capitão de Órbita',
    items: [
      { label: 'Candidaturas', icon: Inbox, count: 3 },
      { label: 'Entregas', icon: PackageCheck },
    ],
  },
]

/** A whole screen composed in the language: side navigation, top bar, summary, detail and lateral column. */
export function AppFrame() {
  return (
    <div className="tx-frame">
      <aside className="tx-side" aria-label="Navegação de exemplo">
        <div className="tx-side__brand">
          <MarcaHe4rt tamanho={28} />
          He4rt Hub
        </div>
        {GROUPS.map((group) => (
          <div key={group.label} className="tx-side__group" role="group" aria-label={group.label}>
            <span className="tx-side__label tx-label">{group.label}</span>
            <div className="tx-side__line">
              {group.items.map((item) => (
                <a
                  key={item.label}
                  href="#malha-app"
                  className="tx-side__item"
                  aria-current={item.current ? 'page' : undefined}
                  aria-label={item.count ? `${item.label}, ${item.count} pendentes` : undefined}
                >
                  <Node kind={item.current ? 'current' : 'future'} />
                  <item.icon strokeWidth={1.75} aria-hidden />
                  <span>{item.label}</span>
                  {item.count ? <Count value={item.count} label={`${item.count} pendentes`} /> : <span />}
                </a>
              ))}
            </div>
          </div>
        ))}
        <div className="tx-side__foot">
          <Avatar name="Ana Souza" size="sm" />
          <span>
            <b>Ana Souza</b>
            <span className="tx-mono" style={{ color: 'var(--meta)', fontSize: 12 }}>
              @anasouza
            </span>
          </span>
        </div>
      </aside>

      <div>
        <header className="tx-top">
          <nav className="tx-path" aria-label="Onde você está">
            <span>Trajetória</span>
            <i aria-hidden />
            <span aria-current="page">Início</span>
          </nav>
          <div className="tx-row">
            <label className="tx-search">
              <Search strokeWidth={1.75} aria-hidden />
              <input className="tx-input" placeholder="Buscar membros, squads e discussões" aria-label="Buscar" />
            </label>
            <Button variant="icon" aria-label="Notificações, 2 novas">
              <Bell strokeWidth={1.75} aria-hidden />
            </Button>
          </div>
        </header>

        <div className="tx-frame__main">
          <div className="tx-frame__head">
            <div>
              <h3>Bom te ver, Ana</h3>
              <p>Sua última entrega foi aceita ontem. Falta uma validação para chegar a Com entrega.</p>
            </div>
            <Button variant="primary">Pedir validação</Button>
          </div>

          <Tabs
            label="Feed"
            defaultValue="feed"
            tabs={[
              {
                value: 'feed',
                label: 'Comunidade',
                content: (
                  <div className="tx-stack">
                    <Publication kind="project" />
                    <Publication kind="learning" />
                  </div>
                ),
              },
              { value: 'squad', label: 'Meu squad (2)', content: <p className="tx-meta">Duas entregas novas no squad Órbita.</p> },
              { value: 'saved', label: 'Salvas', content: <p className="tx-meta">As publicações que você salvou aparecem aqui.</p> },
            ]}
          />

          <aside className="tx-frame__lateral" aria-label="Seu momento">
            <section>
              <h4>Sua jornada</h4>
              <JourneyCompact current={2} />
            </section>
            <section className="tx-sheet">
              <h4>Órbita</h4>
              <span className="tx-mono" style={{ color: 'var(--meta)', fontSize: 12 }}>
                squad-orbita
              </span>
              <dl>
                <dt>Capitão</dt>
                <dd>Rafael Lima</dd>
                <dt>Projeto</dt>
                <dd>Painel de eventos</dd>
              </dl>
              <Steps value={3} total={5} label="3 de 5 vagas ocupadas" />
            </section>
            <section>
              <h4>Conquistas recentes</h4>
              <Achievement name="Primeira entrega aceita" text="No squad Órbita, em" date="22 de novembro" />
              <Achievement name="Diário de um mês" text="Quatro semanas registrando, até" date="18 de novembro" />
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
