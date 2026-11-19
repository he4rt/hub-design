import { PageHeader } from '@/components/page-header'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { createPost } from '../actions'
import { PostForm } from '../components/post-form'

export default function FeedCreate() {
  const account = useAccount()
  if (!account) return null

  return (
    <>
      <PageHeader title="Nova publicação" description="Registre o que você aprendeu no seu diário." />
      <PostForm
        account={account}
        initial={{ learned: '', applied: '', objectiveProgress: null, sharedOnFeed: true, shownOnProfile: false, collectionIds: [] }}
        title="Nova publicação"
        submitLabel="Publicar"
        onSave={async (input) => {
          await createPost(account.id, input)
          return { to: input.sharedOnFeed ? '/app' : '/app?view=mine', notice: 'Publicação adicionada.' }
        }}
      />
    </>
  )
}
