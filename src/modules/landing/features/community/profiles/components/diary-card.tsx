import { useSearchParams } from 'react-router'
import { Card } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatPostDate, OBJECTIVE_PROGRESS } from '@/lib/feed-post'
import { labelOf } from '@/lib/member-profile'
import type { FeedCollection, FeedPost } from '@/mocks/db'
import './diary-card.css'

/**
 * The diary publications the member chose to show on the profile, newest first, filtered by
 * trilha. Never their reactions: the profile is a trajectory, not a scoreboard.
 */
export function DiaryCard({
  posts,
  collections,
  empty,
}: {
  posts: FeedPost[]
  collections: FeedCollection[]
  empty: string
}) {
  const [params, setParams] = useSearchParams()
  // A trilha shows only with at least one publication the member showed here.
  const trilhas = collections
    .map((c) => ({ ...c, count: posts.filter((p) => p.collectionIds.includes(c.id)).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const selected = trilhas.find((c) => c.id === params.get('trilha'))?.id ?? 'all'
  const shown = selected === 'all' ? posts : posts.filter((p) => p.collectionIds.includes(selected))

  return (
    <Card className="diary-card" aria-labelledby="diary-card-title">
      <h2 id="diary-card-title">Diário de aprendizado</h2>
      {trilhas.length > 0 && (
        <ToggleGroup
          type="single"
          variant="chips"
          value={selected}
          aria-label="Trilhas"
          onValueChange={(next) =>
            next &&
            setParams(
              (current) => {
                const result = new URLSearchParams(current)
                if (next === 'all') result.delete('trilha')
                else result.set('trilha', next)
                return result
              },
              { replace: true },
            )
          }
        >
          <ToggleGroupItem value="all">
            Tudo <span className="diary-card__count">{posts.length}</span>
          </ToggleGroupItem>
          {trilhas.map((c) => (
            <ToggleGroupItem key={c.id} value={c.id} title={c.name}>
              {c.name} <span className="diary-card__count">{c.count}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      {shown.length === 0 ? (
        <p className="diary-card__muted">{empty}</p>
      ) : (
        <ol className="diary-card__posts">
          {shown.map((post) => (
            <li key={post.id}>
              <time dateTime={post.createdAt}>
                {formatPostDate(post.createdAt)}
                {post.editedAt && ` · editada em ${formatPostDate(post.editedAt)}`}
              </time>
              <p>{post.learned}</p>
              <p className="diary-card__muted">Como aplicou: {post.applied}</p>
              <p className="diary-card__muted">{labelOf(OBJECTIVE_PROGRESS, post.objectiveProgress)} do objetivo</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
