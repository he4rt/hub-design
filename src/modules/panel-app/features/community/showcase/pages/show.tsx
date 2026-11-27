import { Link, useParams } from 'react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { useDebugActions } from '@/debug/use-debug-actions'
import { useDb } from '@/mocks/db'

/** Provisional: the project page comes in a later step; the route already answers the card's link. */
export default function ShowcaseShow() {
  const { slug } = useParams()
  const project = useDb((state) => state.showcaseProjects.find((p) => p.slug === slug))
  useDebugActions('Projeto do Showcase', [])

  return (
    <>
      <PageHeader
        parent={{ to: '/app/showcase', label: 'Showcase' }}
        title={project?.title ?? 'Projeto não encontrado'}
        description="A página do projeto ainda está em construção."
      />
      <Button variant="secondary" asChild>
        <Link to="/app/showcase">Voltar ao Showcase</Link>
      </Button>
    </>
  )
}
