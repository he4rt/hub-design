import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { RadioCard, RadioCards } from '@/components/ui/radio-cards'
import { FEEDBACK_TEMPLATES, feedbackTemplate, type FeedbackTemplateId } from '../lib/feedback-templates'
import { MarkdownText } from './markdown-text'
import './feedback-dialog.css'

/**
 * Choosing how to give feedback: the models on the left, the chosen one previewed on the right.
 * Writing happens on its own page, with the editor; this dialog only leads there.
 */
export function FeedbackDialog({
  discussionId,
  open,
  onOpenChange,
  initialTemplate = 'constructive',
  replacing = false,
}: {
  discussionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTemplate?: FeedbackTemplateId
  /** Opened from the editor: the chosen model replaces what was written. */
  replacing?: boolean
}) {
  const [templateId, setTemplateId] = useState<FeedbackTemplateId>(initialTemplate)
  const template = feedbackTemplate(templateId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="feedback-dialog"
        title="Que retorno você quer dar?"
        description={replacing
          ? 'O modelo escolhido substitui o que você escreveu até agora.'
          : 'Escolha um modelo para começar. Na próxima tela, você escreve por cima dele.'}
        footer={
          <>
            <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
            <Button asChild>
              <Link to={`/app/discussions/${discussionId}/feedback?modelo=${template.id}`} replace={replacing} onClick={() => onOpenChange(false)}>
                {template.id === 'free' ? 'Escrever do zero' : 'Usar este modelo'}
              </Link>
            </Button>
          </>
        }
      >
        <div className="feedback-dialog__step">
          <div className="feedback-dialog__side">
            <RadioCards aria-label="Modelo de retorno" value={templateId} onValueChange={(value) => setTemplateId(value as FeedbackTemplateId)}>
              {FEEDBACK_TEMPLATES.map((t) => (
                <RadioCard key={t.id} value={t.id} label={t.label} description={t.description} />
              ))}
            </RadioCards>
          </div>
          <div className="feedback-dialog__preview" aria-label={`Prévia do modelo ${template.label}`}>
            <p className="feedback-dialog__caption">Prévia do modelo</p>
            <div key={template.id} className="feedback-dialog__fade">
              {template.body ? (
                <MarkdownText>{template.body}</MarkdownText>
              ) : (
                <p className="feedback-dialog__empty">
                  Uma página em branco. O editor aceita Markdown e formata enquanto você digita.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
