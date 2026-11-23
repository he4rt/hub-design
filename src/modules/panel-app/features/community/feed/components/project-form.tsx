import { useActionState, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Code2 } from 'lucide-react'
import { FormMessage } from '@/components/form-message'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDebugActions } from '@/debug/use-debug-actions'
import type { FeedPost, MemberProject, User } from '@/mocks/db'
import { errorMessage } from '@/mocks/mock-action'
import { githubHandle } from '@/mocks/squads'
import { parseRepository } from '@/mocks/repositories'
import {
  createProject,
  POST_TEXT_MAX,
  readRepository,
  updateProject,
  validateProject,
  type ProjectInput,
} from '../actions'
import './project-form.css'

type Preview = Awaited<ReturnType<typeof readRepository>>

export function ProjectForm({
  account,
  initial,
  post,
}: {
  account: User
  initial?: MemberProject
  post?: FeedPost
}) {
  const navigate = useNavigate()
  const [repository, setRepository] = useState(initial?.repository.url ?? '')
  const [preview, setPreview] = useState<Preview | null>(
    initial
      ? { fullName: initial.repository.fullName, read: initial.read, existingPostId: post?.id ?? null }
      : null,
  )
  const [pitch, setPitch] = useState(initial?.pitch ?? '')
  const [shownOnProfile, setShownOnProfile] = useState(post?.shownOnProfile ?? false)
  const [showReactionCounts, setShowReactionCounts] = useState(post?.showReactionCounts ?? false)
  const [discarding, setDiscarding] = useState(false)
  const checkedPreview = preview?.fullName === parseRepository(repository)?.toLowerCase() ? preview : null
  const [readError, load, reading] = useActionState(async () => {
    try {
      setPreview(await readRepository(account.id, repository))
      return null
    } catch (e) {
      setPreview(null)
      return errorMessage(e)
    }
  }, null)
  const input: ProjectInput = { repository, pitch, shownOnProfile, showReactionCounts }
  const [error, submit, pending] = useActionState(async () => {
    const invalid = validateProject(input)
    if (invalid) return invalid
    try {
      if (initial && post) await updateProject(account.id, post.id, input)
      else await createProject(account.id, input)
      navigate('/app', {
        state: {
          notice: {
            tone: 'success',
            text: initial ? 'Projeto atualizado.' : 'Projeto publicado.',
          },
        },
      })
      return null
    } catch (e) {
      return errorMessage(e)
    }
  }, null)
  const busy = pending || reading
  const dirty =
    repository !== (initial?.repository.url ?? '') ||
    pitch !== (initial?.pitch ?? '') ||
    shownOnProfile !== (post?.shownOnProfile ?? false) ||
    showReactionCounts !== (post?.showReactionCounts ?? false)
  const close = () => (dirty ? setDiscarding(true) : navigate('/app', { preventScrollReset: true }))

  useDebugActions('Publicar projeto', [
    {
      label: 'Preencher projeto com documentos',
      run: () => {
        setRepository(`https://github.com/${githubHandle(account)}/agenda-de-lives`)
        setPitch('Uma agenda para não perder as lives da comunidade.')
      },
    },
    {
      label: 'Preencher repositório sem documentos',
      run: () => {
        setRepository(`https://github.com/${githubHandle(account)}/dotfiles`)
        setPitch('Minha configuração de desenvolvimento, organizada para compartilhar.')
      },
    },
  ])

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !busy && close()}>
        <DialogContent
          className="project-form-dialog"
          title={initial ? 'Editar projeto' : 'Publicar projeto'}
          description="Mostre o que você está construindo. A prévia leva direto ao GitHub."
          footer={
            <>
              <Button variant="secondary" disabled={busy} onClick={close}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="project-publish"
                loading={pending}
                disabled={reading || !checkedPreview || (!initial && !!checkedPreview.existingPostId)}
              >
                {initial ? 'Salvar alterações' : 'Publicar projeto'}
              </Button>
            </>
          }
        >
          <div className="project-form">
            <form action={load} className="project-form__repository">
              <Label htmlFor="project-repository">Link do repositório</Label>
              <div className="project-form__read">
                <Input
                  id="project-repository"
                  placeholder="github.com/seu-usuario/seu-projeto"
                  value={repository}
                  onChange={(e) => setRepository(e.target.value)}
                  disabled={!!initial || busy}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  loading={reading}
                  disabled={!!initial || pending || !parseRepository(repository)}
                >
                  Carregar
                </Button>
              </div>
              <p className="project-form__hint">
                Repositório público da sua conta do GitHub. Leitura simulada neste protótipo.
              </p>
              <FormMessage tone="error">{readError}</FormMessage>
            </form>
            {checkedPreview && (
              <div className="project-form__preview">
                <Code2 size={20} aria-hidden />
                <div>
                  <strong>{checkedPreview.read.name}</strong>
                  <p>{checkedPreview.read.description ?? checkedPreview.fullName}</p>
                </div>
              </div>
            )}
            {!initial && checkedPreview?.existingPostId ? (
              <p className="project-form__existing">
                Este projeto já está no Hub.{' '}
                <Link to={`/app/feed/${checkedPreview.existingPostId}/edit`}>
                  Editar publicação existente
                </Link>
              </p>
            ) : null}
            <form id="project-publish" action={submit} className="project-form" noValidate>
              <fieldset disabled={busy} className="project-form__fields">
                <div className="project-form__field">
                  <Label htmlFor="project-pitch">Conte sobre o projeto</Label>
                  <Textarea
                    id="project-pitch"
                    rows={3}
                    maxLength={POST_TEXT_MAX}
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    placeholder="O que você criou e por que resolveu construir isso?"
                  />
                  <span className="project-form__counter">
                    {pitch.length}/{POST_TEXT_MAX}
                  </span>
                </div>
                <p className="project-form__hint">
                  Quer ajuda com o projeto? Abra uma discussão no Fórum e vincule esta publicação.
                </p>
                <div className="project-form__check">
                  <Checkbox
                    id="project-profile"
                    checked={shownOnProfile}
                    onCheckedChange={(v) => setShownOnProfile(v === true)}
                  />
                  <Label htmlFor="project-profile">Mostrar no meu perfil público</Label>
                </div>
                <div className="project-form__check">
                  <Checkbox
                    id="project-counts"
                    checked={showReactionCounts}
                    onCheckedChange={(v) => setShowReactionCounts(v === true)}
                  />
                  <Label htmlFor="project-counts">Todos veem os números das reações</Label>
                </div>
              </fieldset>
              <FormMessage tone="error">{error}</FormMessage>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={discarding} onOpenChange={setDiscarding}>
        <DialogContent
          title="Descartar alterações?"
          description="O que você escreveu não será salvo."
          footer={
            <>
              <DialogClose asChild>
                <Button variant="secondary">Continuar escrevendo</Button>
              </DialogClose>
              <Button variant="danger" onClick={() => navigate('/app', { preventScrollReset: true })}>
                Descartar
              </Button>
            </>
          }
        />
      </Dialog>
    </>
  )
}
