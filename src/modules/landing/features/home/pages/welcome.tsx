import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDebugActions } from '@/debug/use-debug-actions'
import './welcome.css'

export default function Welcome() {
  const navigate = useNavigate()

  useDebugActions('Landing', [
    { label: 'Abrir login do /app', run: () => navigate('/app/login') },
    { label: 'Abrir usuários do /admin', run: () => navigate('/admin/users') },
  ])

  return (
    <main className="welcome">
      <section className="welcome__hero">
        <h1>A comunidade He4rt num só lugar.</h1>
        <p>Protótipo navegável: todos os dados e ações são mockados. Use o painel de debug (Alt+D) para simular cenários.</p>
        <div className="welcome__cta">
          <Button asChild>
            <Link to="/app">Acessar o app</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/admin">Painel admin</Link>
          </Button>
        </div>
      </section>

      <section className="welcome__grid">
        <Card>
          <h2>/app</h2>
          <p>Área do membro: login, dashboard e configurações de conta.</p>
        </Card>
        <Card>
          <h2>/admin</h2>
          <p>Painel administrativo: gestão de usuários e visão geral.</p>
        </Card>
      </section>
    </main>
  )
}
