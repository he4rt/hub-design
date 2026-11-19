import { useParams } from 'react-router'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { useDb } from '@/mocks/db'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { canManagePost, updatePost } from '../actions'
import { PostForm } from '../components/post-form'

/** The author edits a publication from "Minhas publicações". */
export default function FeedEdit() {
  const { postId } = useParams()
  const account = useAccount()
  const post = useDb((db) => db.feedPosts.find((p) => p.id === postId))
  if (!account) return null
  // Someone else's or a deleted publication looks like a missing one.
  if (!post || !canManagePost(post, account.id)) return <NotFound />

  return (
    <>
      <PageHeader
        title="Editar publicação"
        description="Quem lê vê que a publicação foi editada e quando. A versão anterior fica guardada para a moderação."
      />
      <PostForm
        key={post.id}
        account={account}
        initial={{
          learned: post.learned,
          applied: post.applied,
          objectiveProgress: post.objectiveProgress,
          sharedOnFeed: post.sharedOnFeed,
          shownOnProfile: post.shownOnProfile,
          collectionIds: post.collectionIds,
        }}
        title="Editar publicação"
        submitLabel="Salvar alterações"
        onSave={async (input) => {
          await updatePost(account.id, post.id, input)
          return { to: '/app?view=mine', notice: 'Publicação atualizada.' }
        }}
      />
    </>
  )
}
