import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import { db } from '@/mocks/db'
import './welcome.css'

const STEPS = [
  { title: 'Registre a trajetória', text: 'O que você aprendeu, praticou e entregou, inclusive os cursos da Basement.' },
  { title: 'Pratique em squad', text: 'Projeto colaborativo nos repositórios da He4rt, conduzido por um capitão.' },
  { title: 'Tenha o trabalho validado', text: 'Pessoas da comunidade registram o que viram você fazer, com evidência.' },
]

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
      <section className="welcome__hero">
        <h1>Sua trajetória em tecnologia, validada pela comunidade.</h1>
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

      <section className="welcome__section">
        <h2>Como funciona</h2>
        <ol className="welcome__steps">
          {STEPS.map((step) => (
            <li key={step.title}>
              <Card>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
