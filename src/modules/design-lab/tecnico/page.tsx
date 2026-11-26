import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Dialog } from 'radix-ui'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useStore } from '@/lib/store'
import { MarcaHe4rt } from './marca'
import { AppFrame } from './app-frame'
import { Achievement, CompetencyLevel, Journey, Metric, Publication, Reactions, RepoPreview, Validation } from './hub'
import { Avatar, Button, Chip, Count, Field, Figure, Meter, Node, Note, Steps, Switch, Tabs } from './parts'
import { FONTS, malhaStore } from './theme'
import './malha.css'


const SECTIONS = [
  ['01', 'Fundamentos', 'fundamentos'],
  ['02', 'Controles', 'controles'],
  ['03', 'Navegação', 'navegacao'],
  ['04', 'Trajetória', 'trajetoria'],
  ['05', 'Registros', 'registros'],
  ['06', 'Mensagens', 'mensagens'],
  ['07', 'Uma tela inteira', 'tela'],
]

const PALETTE = [
  ['cal', 'Página'],
  ['banda', 'Sidebar e agrupamento'],
  ['superficie', 'Campo e publicação'],
  ['fio', 'Divisor'],
  ['fio-forte', 'Borda de controle'],
  ['asfalto', 'Texto e seleção'],
  ['muted', 'Relato'],
  ['meta', 'Metadado'],
  ['linha-membro', 'Traço do membro'],
  ['roxo-heart', 'Ação principal'],
  ['roxo-profundo', 'Material de marca'],
  ['lilas', 'Competência'],
]

const LIST = [
  { name: 'Bruno Lima', title: 'Candidatura ao Painel de eventos', tone: 'warning', state: 'Pendente', when: 'Na fila desde 18 nov.' },
  { name: 'Carla Dias', title: 'Entrega da busca do acervo', tone: 'success', state: 'Aceita', when: 'Ontem' },
  { name: 'Diego Alves', title: 'Teste de entrada do squad Órbita', tone: 'info', state: 'Aguardando revisão', when: 'Há 3 dias' },
  { name: 'Elisa Rocha', title: 'Candidatura ao Painel de eventos', tone: 'neutral', state: 'Recusada com retorno', when: 'Há 1 semana' },
] as const

const MIN_REASON = 30

/**
 * The "Técnico × Traçado" manual: the Técnico identity (cool grays, #5B3DF5, Geist, rounded
 * corners) on every component, and the Traçado (line, node, piece) only in the trajectory.
 * Its CSS is scoped to `.tx`, so it only exists inside /design-lab.
 */
export default function Tecnico() {
  const theme = useStore(malhaStore, (s) => s.theme)
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  const [reason, setReason] = useState('')
  const [reactions, setReactions] = useState<string[]>(['learning-too'])
  const [loading, setLoading] = useState(false)
  const [empty, setEmpty] = useState(false)
  const id = useId()

  useDebugActions('Técnico × Traçado', [
    { label: 'Tema claro', run: () => malhaStore.set(() => ({ theme: 'light' })) },
    { label: 'Tema escuro', run: () => malhaStore.set(() => ({ theme: 'dark' })) },
    { label: 'Botão carregando', run: () => setLoading((l) => !l) },
    { label: 'Lista vazia', run: () => setEmpty((e) => !e) },
    { label: 'Motivo curto (erro esperado)', run: () => setReason('Faltou teste.') },
  ])

  return (
    <div ref={setRoot} className="tx" data-theme={theme} data-variant="tecnico">
      <link rel="stylesheet" href={FONTS} precedence="design-lab" />

      <header className="tx-mast">
        <div className="tx-mast__top">
          <span className="tx-mast__brand">
            <MarcaHe4rt tamanho={28} />
            He4rt Hub
          </span>
          <div className="tx-row">
            <Link viewTransition to="/design-lab/feed">Feed</Link>
            <Link viewTransition to="/design-lab/perfil">Meu perfil</Link>
            <button
              type="button"
              className="tx-btn"
              data-size="compact"
              style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,.4)' }}
              onClick={() => malhaStore.set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' }))}
            >
              {theme === 'dark' ? 'Ver no claro' : 'Ver no escuro'}
            </button>
          </div>
        </div>
        <div>
          <h1 className="tx-mast__title">{'Traçado, técnico'}</h1>
          <p className="tx-mast__lede">
            {'O preset Técnico em toda a interface: cinzas frios, roxo #5B3DF5, Geist e cantos arredondados. O Traçado (linha, nó, peça) fica só na trajetória do membro.'}
          </p>
        </div>
        <nav className="tx-mast__index" aria-label="Seções">
          {SECTIONS.map(([n, label, anchor]) => [n, anchor === 'fundamentos' ? 'Cores' : label, anchor]).map(([n, title, anchor]) => (
            <a key={anchor} href={`#${anchor}`}>
              <span>{n}</span>
              {title}
            </a>
          ))}
        </nav>
        <div className="tx-mast__route" aria-hidden>
          <svg viewBox="0 0 1200 96" preserveAspectRatio="none">
            <path d="M0 64 H340 a16 16 0 0 0 16 -16 a16 16 0 0 1 16 -16 H700" fill="none" stroke="var(--tx-mast-accent)" strokeWidth="4" />
            <path d="M340 64 H560" fill="none" stroke="var(--tx-mast-accent)" strokeWidth="2" opacity=".5" />
            <path d="M700 32 H1200" fill="none" stroke="var(--tx-mast-future)" strokeWidth="2" strokeDasharray="5 5" />
            <circle cx="120" cy="64" r="6" fill="var(--tx-mast-accent)" />
            <circle cx="480" cy="32" r="6" fill="var(--tx-mast-accent)" />
            <circle cx="700" cy="32" r="9" fill="var(--tx-mast-bg)" stroke="#ffffff" strokeWidth="3" />
            <circle cx="700" cy="32" r="3" fill="#ffffff" />
            <circle cx="920" cy="32" r="6" fill="var(--tx-mast-bg)" stroke="var(--tx-mast-future)" strokeWidth="2" />
            <circle cx="1120" cy="32" r="6" fill="var(--tx-mast-bg)" stroke="var(--tx-mast-future)" strokeWidth="2" />
            <text x="132" y="88">Membro</text>
            <text x="492" y="22">Preparado</text>
            <text x="716" y="22" className="tx-mast__current">Praticante</text>
            <text x="932" y="22">Com entrega</text>
            <text x="1132" y="22">Validado</text>
            <text x="572" y="68">ramal do squad Órbita</text>
          </svg>
        </div>
      </header>

      <main className="tx-doc">
        <Section n="01" id="fundamentos" title={'Cores'} aside={'Cinzas frios, roxo #5B3DF5 e Geist em toda a interface. Linha, nó, peça e arco ficam reservados à trajetória.'}>
          <Figure n="1.1" span={12} title="Paleta" note="Cerca de 90% neutro. O roxo aparece como trilho, nó, contador e ação principal.">
            <div className="tx-swatches">
              {PALETTE.map(([token, label]) => (
                <div key={token} className="tx-swatch">
                  <span style={{ background: `var(--${token})` }} />
                  <b>{label}</b>
                  <code className="tx-mono">{token}</code>
                </div>
              ))}
            </div>
          </Figure>
        </Section>

        <Section n="02" id="controles" title="Controles" aside={'Cantos arredondados do preset Quente (8, 14 e 20px), bordas de 1,5px em asfalto e foco numa linha só. Controles de 44px.'}>
          <Figure n="2.1" span={7} title="Botões" note={'Uma ação roxa por tela. O terciário ganha uma pílula suave ao passar o mouse.'}>
            <div className="tx-stack">
              <div className="tx-row">
                <Button variant="primary" loading={loading}>
                  Pedir validação
                </Button>
                <Button>Salvar rascunho</Button>
                <Button variant="tertiary">Ver retorno</Button>
                <Button variant="danger">Devolver</Button>
                <Button variant="icon" aria-label="Notificações">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4" />
                  </svg>
                </Button>
              </div>
              <div className="tx-row">
                <Button variant="primary" size="compact">
                  Publicar
                </Button>
                <Button size="compact" disabled>
                  Candidatura enviada
                </Button>
                <span className="tx-meta">Desabilitado diz o motivo ao lado: uma candidatura por projeto.</span>
              </div>
            </div>
          </Figure>
          <Figure n="2.2" span={5} title="Chips e contador" note={'Em pílula, sem ícone. Tag é contorno, para nunca parecer estado.'}>
            <div className="tx-stack">
              <div className="tx-row">
                <Chip tone="success">Aceita</Chip>
                <Chip tone="warning">Pendente</Chip>
                <Chip tone="info">Aguardando revisão</Chip>
                <Chip tone="neutral">Na fila</Chip>
              </div>
              <div className="tx-row">
                <Chip tone="comp">Modelagem de dados</Chip>
                <Chip>Laravel</Chip>
                <span className="tx-label">
                  Candidaturas <Count value={14} label="14 pendentes" />
                </span>
              </div>
            </div>
          </Figure>
          <Figure n="2.3" span={7} title="Campos" note="O rótulo fica sempre acima. O motivo de uma devolução mostra quanto falta, como uma linha que enche.">
            <div className="tx-stack">
              <Field id={`${id}-name`} label="Nome do projeto" aside="Aparece no perfil">
                <input id={`${id}-name`} className="tx-input" defaultValue="Agenda de lives" />
              </Field>
              <Field
                id={`${id}-reason`}
                label="Motivo da devolução"
                aside="Obrigatório"
                error={reason.trim().length > 0 && reason.trim().length < MIN_REASON ? `Escreva pelo menos ${MIN_REASON} caracteres. Quem enviou vai ler este retorno.` : undefined}
              >
                <textarea
                  id={`${id}-reason`}
                  className="tx-input"
                  placeholder="O que fortalecer para a próxima"
                  value={reason}
                  aria-invalid={reason.trim().length > 0 && reason.trim().length < MIN_REASON ? true : undefined}
                  aria-describedby={`${id}-reason-hint`}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Meter length={reason.trim().length} min={MIN_REASON} />
              </Field>
            </div>
          </Figure>
          <Figure n="2.4" span={5} title="Escolhas" note="Ligado é asfalto, nunca roxo: dois roxos não competem na tela.">
            <div className="tx-stack">
              <label className="tx-row" htmlFor={`${id}-switch`}>
                <Switch id={`${id}-switch`} defaultChecked />
                Mostrar no perfil público
              </label>
              <label className="tx-row" htmlFor={`${id}-switch2`}>
                <Switch id={`${id}-switch2`} />
                Contar as reações para todos
              </label>
            </div>
          </Figure>
        </Section>

        <Section n="03" id="navegacao" title="Navegação" aside={'Sidebar em lista simples, com o item atual destacado em superfície. Abas com sublinhado em asfalto.'}>
          <Figure n="3.1" span={8} title="Abas" note={'Sublinhado na aba ativa. Contagem entre parênteses.'}>
            <Tabs
              label="Meu squad"
              defaultValue="deliveries"
              tabs={[
                { value: 'deliveries', label: 'Entregas (2)', content: <p className="tx-meta">Duas entregas aguardando o capitão.</p> },
                { value: 'members', label: 'Membros', content: <p className="tx-meta">Cinco membros ativos no squad Órbita.</p> },
                { value: 'log', label: 'Registro', content: <p className="tx-meta">O registro nunca apaga nada.</p> },
              ]}
            />
          </Figure>
          <Figure n="3.2" span={4} title="Progresso" note={'Barra em segmentos, um por vaga.'}>
            <Steps value={3} total={5} label="3 de 5 vagas ocupadas" />
          </Figure>
        </Section>

        <Section n="04" id="trajetoria" title="Trajetória" aside={'Aqui, e só aqui, entra o Traçado: a jornada como linha, cada registro como nó, a competência como peça. Depois de Validado a linha segue tracejada.'}>
          <Figure n="4.1" span={12} title="Jornada" note="Cinco estágios. O atual é o único escrito em peso e tamanho maiores.">
            <Journey current={2} />
          </Figure>
          <Figure n="4.2" span={7} title="Linha do tempo" note="Data à esquerda, nó no trilho, fato à direita. O ramal do squad sai da linha numa curva de raio 16.">
            <ol className="tx-tl">
              <li className="tx-tl__item">
                <span className="tx-tl__date">22 nov.</span>
                <span className="tx-tl__node">
                  <Node kind="validated" />
                </span>
                <div>
                  <p className="tx-tl__title">Validação registrada em Modelagem de dados</p>
                  <p className="tx-tl__text">Carla Dias validou a busca do acervo, com o plano anexado ao PR.</p>
                </div>
              </li>
              <li className="tx-tl__item">
                <span className="tx-tl__date">14 nov.</span>
                <span className="tx-tl__node">
                  <Node kind="done" />
                </span>
                <div>
                  <p className="tx-tl__title">Entrega aceita no squad Órbita</p>
                  <p className="tx-tl__text">Antes, uma devolução com retorno: separar a busca em um componente.</p>
                  <p className="tx-tl__ramal">
                    <svg width="28" height="20" aria-hidden>
                      <path d="M2 0 V4 a16 16 0 0 0 16 16 H28" fill="none" stroke="var(--ramal)" strokeWidth="2" />
                    </svg>
                    ramal do squad Órbita
                  </p>
                </div>
              </li>
              <li className="tx-tl__item" data-next="future">
                <span className="tx-tl__date">2 nov.</span>
                <span className="tx-tl__node">
                  <Node kind="done" />
                </span>
                <div>
                  <p className="tx-tl__title">Entrou no squad Órbita</p>
                  <p className="tx-tl__text">Teste de entrada aprovado por Rafael Lima.</p>
                </div>
              </li>
              <li className="tx-tl__item">
                <span className="tx-tl__date">Próximo</span>
                <span className="tx-tl__node">
                  <Node kind="pending" />
                </span>
                <div>
                  <p className="tx-tl__title" style={{ color: 'var(--muted)' }}>
                    Pedir validação em Testes automatizados
                  </p>
                </div>
              </li>
            </ol>
          </Figure>
          <Figure n="4.3" span={5} title="Competência e conquistas" note="A peça nunca anima nem compara. A conquista é marco com nome e data.">
            <div className="tx-stack">
              <CompetencyLevel name="Modelagem de dados" level={4} from={3} />
              <CompetencyLevel name="Testes automatizados" level={2} />
              <div>
                <Achievement name="Primeira entrega aceita" text="No squad Órbita, em" date="14 de novembro" />
                <Achievement name="Diário de um mês" text="Quatro semanas registrando, até" date="18 de novembro" />
              </div>
            </div>
          </Figure>
        </Section>

        <Section n="05" id="registros" title="Registros" aside={'Publicação com o relato em destaque, em Geist. Validação em bloco técnico; resultado é número medido.'}>
          <Figure n="5.1" span={12} title="Validação" note="Imutável. Quem validou e a declaração de conflito ficam na margem.">
            <Validation />
          </Figure>
          <Figure n="5.2" span={7} title="Publicação" note="Quem, o relato em destaque e o que o registro produziu. Reações ficam no rodapé.">
            <div className="tx-stack">
              <Publication kind="project" />
              <Publication kind="learning" />
            </div>
          </Figure>
          <div className="tx-span-5 tx-stack" style={{ gap: 'var(--space-10)' }}>
            <Figure n="5.3" span={12} title="Métrica" note="Do antes ao depois num trecho de linha. Sem número medido, não existe.">
              <Metric label="Tempo da listagem do acervo" before="2,1 s" after="40 ms" gain="52× mais rápido" />
            </Figure>
            <Figure n="5.4" span={12} title="Prévia de repositório" note="Trabalho, não popularidade: sem estrelas nem forks.">
              <RepoPreview />
            </Figure>
            <Figure n="5.5" span={12} title="Reações" note="Um botão para reagir abre as quatro; as já dadas ficam ao lado, com a contagem.">
              <Reactions value={reactions} onChange={setReactions} others={{ 'learning-too': 2, helped: 5 }} />
            </Figure>
          </div>
        </Section>

        <Section n="06" id="mensagens" title="Mensagens" aside="Alerta é nota de margem com régua na cor do estado. Lista é tabela editorial com fio, sem caixa em volta de cada item.">
          <Figure n="6.1" span={7} title="Alertas" note="O tipo vai escrito à esquerda; a cor nunca vai sozinha.">
            <div>
              <Note title="Uma candidatura por projeto.">Assim todos têm vez. Você pode retirar e mandar outra.</Note>
              <Note tone="warning" title="Uma validação registrada não muda.">Uma correção vira um novo registro, ligado a este.</Note>
              <Note tone="danger" title="Não conseguimos ler o repositório.">Confira se ele continua público e tente de novo.</Note>
            </div>
          </Figure>
          <Figure n="6.2" span={5} title="Diálogo" note={'Cabeçalho, corpo que rola e rodapé fixo.'}>
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <Button variant="danger">Devolver entrega</Button>
              </Dialog.Trigger>
              <Dialog.Portal container={root}>
                <Dialog.Overlay className="tx-scrim" />
                <Dialog.Content className="tx-dialog">
                  <header className="tx-dialog__head">
                    <Dialog.Title className="tx-dialog__title">Devolver a entrega da Carla</Dialog.Title>
                    <Dialog.Description className="tx-dialog__desc">
                      Ela lê o motivo, ajusta e envia de novo. A devolução fica no registro do squad.
                    </Dialog.Description>
                  </header>
                  <div className="tx-dialog__body">
                    <Field id={`${id}-dlg`} label="O que fortalecer" aside="Obrigatório">
                      <textarea id={`${id}-dlg`} className="tx-input" placeholder="Separe a paginação em um teste próprio" />
                    </Field>
                  </div>
                  <footer className="tx-dialog__foot">
                    <span className="tx-meta">Sem prazo para o reenvio.</span>
                    <span className="tx-row">
                      <Dialog.Close asChild>
                        <Button>Cancelar</Button>
                      </Dialog.Close>
                      <Dialog.Close asChild>
                        <Button variant="danger">Devolver</Button>
                      </Dialog.Close>
                    </span>
                  </footer>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </Figure>
          <Figure n="6.3" span={12} title={empty ? 'Estado vazio' : 'Lista'} note={'Régua forte no topo, fio entre linhas. O vazio diz o que vai aparecer e o próximo passo.'}>
            {empty ? (
              <div className="tx-empty">
                <div className="tx-empty__path" aria-hidden>
                  <Node kind="current" />
                  <i />
                  <Node kind="future" />
                  <i />
                  <Node kind="future" />
                </div>
                <div>
                  <p className="tx-empty__title">Nenhuma candidatura ainda</p>
                  <p className="tx-empty__text">Quando alguém se candidatar ao Painel de eventos, ela aparece aqui para você decidir quem entra.</p>
                  <Button onClick={() => setEmpty(false)}>Ver o projeto</Button>
                </div>
              </div>
            ) : (
              <ul className="tx-list">
                {LIST.map((row, i) => (
                  <li key={row.name} className="tx-list__row" aria-current={i === 0 ? 'true' : undefined}>
                    <Avatar name={row.name} />
                    <span style={{ minWidth: 0 }}>
                      <span className="tx-list__title" title={row.title} style={{ display: 'block' }}>
                        {row.title}
                      </span>
                      <span className="tx-meta">{row.name}</span>
                    </span>
                    <Chip tone={row.tone}>{row.state}</Chip>
                    <span className="tx-list__when">{row.when}</span>
                  </li>
                ))}
              </ul>
            )}
          </Figure>
        </Section>

        <Section n="07" id="tela" title="Uma tela inteira" aside={'O Início do membro: tudo técnico, menos a jornada e as conquistas na coluna lateral, que seguem o Traçado.'}>
          <div className="tx-span-12" id="malha-app">
            <AppFrame />
          </div>
        </Section>
      </main>
    </div>
  )
}

function Section({ n, id, title, aside, children }: { n: string; id: string; title: string; aside: string; children: ReactNode }) {
  return (
    <section id={id} className="tx-sec" aria-labelledby={`${id}-title`}>
      <header className="tx-sec__head">
        <span className="tx-sec__num" aria-hidden>
          {n}
        </span>
        <h2 id={`${id}-title`} className="tx-sec__title">
          {title}
        </h2>
        <p className="tx-sec__aside">{aside}</p>
      </header>
      <div className="tx-sec__body">{children}</div>
    </section>
  )
}
