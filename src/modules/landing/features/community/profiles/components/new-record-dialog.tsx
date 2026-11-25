import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import './new-record-dialog.css'

/** What the member can add by hand; each opens its form in Editar perfil. */
const OPTIONS = [
  { collection: 'knowledge', label: 'Conhecimento', hint: 'Uma competência que você já tem, com o nível.' },
  { collection: 'learnings', label: 'Aprendizagem', hint: 'Um curso ou um estudo.' },
  { collection: 'experiences', label: 'Experiência', hint: 'Um trabalho fora do Hub.' },
  { collection: 'articles', label: 'Artigo', hint: 'Um texto seu publicado no dev.to.' },
  { collection: 'evidences', label: 'Evidência técnica', hint: 'Um commit, pull request ou repositório do GitHub.' },
]

/**
 * "Novo registro", only for the owner: what the Hub does not record by itself. Squad work,
 * deliveries and validations enter the trajectory on their own.
 */
export function NewRecordDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus size={16} aria-hidden />
          Novo registro
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Novo registro"
        description="O que você quer registrar na trajetória?"
        footer={
          <>
            <span className="new-record-dialog__note">Entregas, evidências de squad e validações entram sozinhas.</span>
            <DialogClose asChild>
              <Button variant="secondary">Cancelar</Button>
            </DialogClose>
          </>
        }
      >
        <ul className="new-record-dialog__list">
          {OPTIONS.map((option) => (
            <li key={option.collection}>
              <Link viewTransition to={`/app/settings/profile?aba=trajetoria&novo=${option.collection}`} className="new-record-dialog__item">
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
