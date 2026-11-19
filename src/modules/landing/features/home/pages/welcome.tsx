import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TrailLog, TrailLogItem } from '@/components/ui/trail-log'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db } from '@/mocks/db'
import './welcome.css'

const STEPS = [
  {
    tone: 'move',
    title: 'Registre a trajetória',
    text: 'O que você aprendeu, praticou e entregou, inclusive os cursos da Basement.',
  },
  {
    tone: 'move',
    title: 'Pratique em squad',
    text: 'Projeto colaborativo nos repositórios da He4rt, conduzido por um capitão.',
  },
  {
    tone: 'success',
    title: 'Tenha o trabalho validado',
    text: 'Pessoas da comunidade registram o que viram você fazer, com evidência.',
  },
] as const

export default function Welcome() {
  const navigate = useNavigate()

  useDebugActions('Página inicial', [
    { label: 'Abrir um perfil publicado', run: () => navigate('/members/ana-souza') },
    { label: 'Abrir um perfil privado', run: () => navigate('/members/bruno-lima') },
    {
      label: 'Sair da conta de membro',
      description: 'Volta a ver a página como visitante.',
      run: () => db.set((state) => ({ ...state, session: null })),
    },
  ])

  return (
    <main className="welcome">
      <section className="welcome__cover">
        <div className="welcome__name">
          <h1>He4rt Hub</h1>
          <p>da comunidade para a comunidade</p>
        </div>
        <CoverArt />
      </section>

      <section className="welcome__intro">
        <p>
          O He4rt Hub reúne o que você aprendeu, praticou e entregou, e o que outras pessoas da comunidade validaram.
          Seu perfil vira um currículo vivo, com link para compartilhar quando você quiser.
        </p>
        <div className="welcome__cta">
          <Button asChild>
            <Link to="/app/register">Criar conta</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/app/login">Entrar</Link>
          </Button>
        </div>
        <p className="welcome__note">Já tem conta na Basement ou no Job Finder? Entre com ela.</p>
      </section>

      <Card className="welcome__steps">
        <h2>Como funciona</h2>
        <TrailLog>
          {STEPS.map((step) => (
            <TrailLogItem key={step.title} tone={step.tone} title={step.title} meta={step.text} />
          ))}
        </TrailLog>
      </Card>
    </main>
  )
}

/**
 * The cover of the design system: color blocks and a trail of dots running down the ink slab, the same
 * motif as the squad log. Fills come from CSS classes so the art follows the tokens and the theme.
 */
function CoverArt() {
  return (
    <svg className="welcome__art" viewBox="480 0 480 300" preserveAspectRatio="xMaxYMid meet" aria-hidden>
      <rect className="welcome__art-ink" x="760" y="-20" width="220" height="340" />
      <rect className="welcome__art-brand" x="500" y="100" width="240" height="180" />
      <rect className="welcome__art-bright" x="600" y="20" width="140" height="60" />
      <rect className="welcome__art-soft" x="500" y="20" width="80" height="60" />
      <line className="welcome__art-rail" x1="870" y1="40" x2="870" y2="280" />
      <circle className="welcome__art-dot" cx="870" cy="40" r="7" />
      <circle className="welcome__art-dot" cx="870" cy="100" r="7" />
      <circle className="welcome__art-success" cx="870" cy="160" r="7" />
      <circle className="welcome__art-dot" cx="870" cy="220" r="7" />
      <circle className="welcome__art-bright" cx="870" cy="280" r="7" />
      <line className="welcome__art-rail" x1="870" y1="160" x2="820" y2="160" />
      <circle className="welcome__art-success" cx="820" cy="160" r="5" />
      <line className="welcome__art-rail" x1="870" y1="220" x2="920" y2="220" />
      <circle className="welcome__art-dot" cx="920" cy="220" r="5" />
    </svg>
  )
}
