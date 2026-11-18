import { Link } from 'react-router'
import './not-found.css'

export function NotFound() {
  return (
    <main className="not-found">
      <h1>404</h1>
      <p>Página não encontrada.</p>
      <Link to="/">Voltar para o início</Link>
    </main>
  )
}
