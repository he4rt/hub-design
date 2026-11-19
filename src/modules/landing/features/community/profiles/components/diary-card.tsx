import { Link, useSearchParams } from 'react-router'
import { MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatPostDate, OBJECTIVE_PROGRESS } from '@/lib/feed-post'
import { labelOf } from '@/lib/member-profile'
import type { FeedCollection, FeedPost } from '@/mocks/db'
import './diary-card.css'

/**
 * The member's diary, newest first, filtered by trilha. Members and visitors read the
 * publications the author showed on the profile; the owner reads all of theirs, each marked with
 * who else sees it, and edits them from here. Never their reactions: the profile is a trajectory,
 * not a scoreboard.
 */
export function DiaryCard({
  posts,
  collections,
  empty,
  ownerView,
}: {
  posts: FeedPost[]
  collections: FeedCollection[]
  empty: string
  /** The owner reading as themselves: every publication, with where it shows and the edit menu. */
  ownerView: boolean
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
            Tudo <span className="diary-card__count">({posts.length})</span>
          </ToggleGroupItem>
          {trilhas.map((c) => (
            <ToggleGroupItem key={c.id} value={c.id} title={c.name}>
              {c.name} <span className="diary-card__count">({c.count})</span>
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
              <div className="diary-card__meta">
                <time dateTime={post.createdAt}>
                  {formatPostDate(post.createdAt)}
                  {post.editedAt && `, editada em ${formatPostDate(post.editedAt)}`}
                </time>
                {ownerView && !post.shownOnProfile && (
                  <Badge title={post.sharedOnFeed ? 'Membros veem no Feed; não aparece aqui para ninguém além de você.' : 'Ninguém além de você vê esta publicação.'}>
                    {post.sharedOnFeed ? 'Só no Feed' : 'Só você vê'}
                  </Badge>
                )}
                {ownerView && (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="diary-card__menu" aria-label="Ações da publicação">
                        <MoreHorizontal size={16} aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/app/feed/${post.id}/edit`}>Editar</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <p className="diary-card__learned">{post.learned}</p>
              <p className="diary-card__muted">Como aplicou: {post.applied}</p>
              <p className="diary-card__muted">{labelOf(OBJECTIVE_PROGRESS, post.objectiveProgress)} do objetivo</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
