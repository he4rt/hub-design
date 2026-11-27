import { Link } from 'react-router'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { useDebugActions } from '@/debug/use-debug-actions'

/** Provisional: publishing a project comes in a later step. */
export default function ShowcaseCreate() {
  useDebugActions('Apresentar um projeto', [])

  return (
    <>
      <PageHeader
        parent={{ to: '/app/showcase', label: 'Showcase' }}
        title="Apresentar um projeto"
        description="O formulário de publicação ainda está em construção."
      />
      <Button variant="secondary" asChild>
        <Link to="/app/showcase">Voltar ao Showcase</Link>
      </Button>
    </>
  )
}
