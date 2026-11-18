import { FileText } from 'lucide-react'
import './readme-card.css'

/** The member's "Sobre mim", framed like a repository's README.md. */
export function ReadmeCard({ handle, readme }: { handle: string; readme: string }) {
  return (
    <section className="readme-card" aria-label="Sobre mim">
      <header className="readme-card__header">
        <FileText size={14} aria-hidden />
        <code>
          {handle} / README.md
        </code>
      </header>
      <div className="readme-card__body">
        {readme.split('\n\n').map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  )
}
