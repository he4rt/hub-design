import type { ReactNode } from 'react'
import { Link } from 'react-router'
import './page-header.css'

export function PageHeader({
  title,
  description,
  actions,
  parent,
}: {
  title: string
  description?: string
  actions?: ReactNode
  /** The page this one belongs to, kept on screen as the way back ("Feed / Salvos"). */
  parent?: { to: string; label: string }
}) {
  return (
    <header className="page-header">
      <div>
        {parent && (
          <nav className="page-header__path" aria-label="Caminho">
            <Link viewTransition to={parent.to}>
              {parent.label}
            </Link>
            <span aria-hidden>/</span>
            <span aria-current="page">{title}</span>
          </nav>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions}
    </header>
  )
}
