import './runtime'
import { afterEach, expect, test } from 'bun:test'
import { db, seedState } from '@/mocks/db'
import { boardItemMoved, boardItemSynced, pullRequestMerged } from '@/mocks/github'

afterEach(() => db.reset())

test.each(['done-first', 'merge-first'])('a technical delivery is created once with %s events', async (order) => {
  db.set(() => structuredClone(seedState))
  const { itemId } = await boardItemSynced('p1', {
    issue: { number: 701, title: 'Aplicar fuso horário nos eventos', url: 'https://github.com/he4rt/loja-checkout/issues/701' },
    status: 'in-review',
    kind: 'technical',
    assigneeIds: ['u5'],
  })
  const pullRequest = { number: 702, url: 'https://github.com/he4rt/loja-checkout/pull/702', reviewerIds: ['u9', 'u7'] }
  const move = () => boardItemMoved(itemId, 'done')
  const merge = () => pullRequestMerged(itemId, 'u2', ['u7'], pullRequest)
  const first = order === 'done-first' ? move : merge
  const second = order === 'done-first' ? merge : move

  await first()
  expect(db.get().deliveries.filter((d) => d.boardItemId === itemId)).toHaveLength(0)
  await second()
  const deliveries = db.get().deliveries.filter((d) => d.boardItemId === itemId)
  expect(deliveries).toHaveLength(1)
  expect(deliveries[0]).toMatchObject({
    status: 'pending',
    collaboration: 'group',
    credits: [{ userId: 'u2', part: '' }, { userId: 'u7', part: '' }, { userId: 'u9', part: '' }, { userId: 'u5', part: '' }],
    evidence: [
      { kind: 'pull-request', ref: 'loja-checkout#702', url: pullRequest.url, authorId: 'u2' },
      { kind: 'review', ref: 'loja-checkout#702:review:u9', url: `${pullRequest.url}/files`, authorId: 'u9' },
      { kind: 'review', ref: 'loja-checkout#702:review:u7', url: `${pullRequest.url}/files`, authorId: 'u7' },
    ],
  })

  await merge()
  await move()
  expect(db.get().deliveries.filter((d) => d.boardItemId === itemId)).toEqual(deliveries)
})
