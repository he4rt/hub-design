import { useParams } from 'react-router'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { useDb } from '@/mocks/db'
import { useAccount } from '@/modules/panel-app/hooks/use-account'
import { canManagePost, updatePost } from '../actions'
import { PostForm } from '../components/post-form'
import { ProjectForm } from '../components/project-form'

/** The author edits a publication from its menu, in the Feed or in their profile. */
export default function FeedEdit() {
  const { postId } = useParams()
  const account = useAccount()
  const post = useDb((db) => db.feedPosts.find((p) => p.id === postId))
  const project = useDb((db) => db.memberProjects.find((p) => p.id === post?.projectId))
  if (!account) return null
  // Someone else's or a deleted publication looks like a missing one.
  if (!post || !canManagePost(post, account.id)) return <NotFound />
  if (project) return <ProjectForm key={project.id} account={account} initial={project} post={post} />

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
          showReactionCounts: post.showReactionCounts,
          collectionIds: post.collectionIds,
        }}
        title="Editar publicação"
        submitLabel="Salvar alterações"
        onSave={async (input) => {
          await updatePost(account.id, post.id, input)
          return {
            to: '/app',
            notice: input.sharedOnFeed || input.shownOnProfile ? 'Publicação atualizada.' : 'Publicação atualizada. Ela continua privada.',
          }
        }}
      />
    </>
  )
}
