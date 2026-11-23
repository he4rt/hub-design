import { expect, test } from 'bun:test'
import { memberAchievements } from '../src/mocks/achievements'
import { seedState } from '../src/mocks/db'

function achievements(onboardedAt: string | null, at: string) {
  const state = structuredClone(seedState)
  state.users[0] = { ...state.users[0], createdAt: '2010-01-01T00:00:00.000Z', onboardedAt, origin: 'basement' }
  return memberAchievements(state, state.users[0].id, Date.parse(at)).filter((achievement) =>
    ['one-month-hub', 'six-months-hub', 'one-year-hub'].includes(achievement.key),
  )
}

test('an old shared account has no Hub tenure before onboarding, nor does an unknown account', () => {
  expect(achievements(null, '2026-11-22T00:00:00.000Z')).toEqual([])
  expect(achievements('2026-11-21T00:00:00.000Z', '2026-11-22T00:00:00.000Z')).toEqual([])
  expect(memberAchievements(seedState, 'missing-user', Date.parse('2026-11-22'))).toEqual([])
})

test('one month means 30 elapsed days from onboarding, not a short calendar month or account creation', () => {
  const joined = '2026-02-01T12:00:00.000Z'
  expect(achievements(joined, '2026-03-03T11:59:59.999Z')).toEqual([])
  expect(achievements(joined, '2026-03-03T12:00:00.000Z')).toMatchObject([
    { key: 'one-month-hub', unlockedAt: '2026-03-03T12:00:00.000Z', source: 'platform', isPublic: false },
  ])
})

test('six months and one year unlock at the onboarding anniversary and preserve the fact date', () => {
  const joined = '2025-05-12T08:30:00.000Z'
  expect(achievements(joined, '2025-11-12T08:29:59.999Z').map((achievement) => achievement.key)).toEqual(['one-month-hub'])
  expect(achievements(joined, '2025-11-12T08:30:00.000Z').find((achievement) => achievement.key === 'six-months-hub')?.unlockedAt).toBe('2025-11-12T08:30:00.000Z')
  expect(achievements(joined, '2026-05-12T08:29:59.999Z')).toHaveLength(2)
  const atAnniversary = achievements(joined, '2026-05-12T08:30:00.000Z')
  expect(atAnniversary.find((achievement) => achievement.key === 'one-year-hub')?.unlockedAt).toBe('2026-05-12T08:30:00.000Z')
  expect(achievements(joined, '2026-11-22T08:30:00.000Z')).toEqual(atAnniversary)
})

test('calculation changes neither persisted facts nor visibility choices', () => {
  const state = structuredClone(seedState)
  const before = structuredClone(state)
  const first = memberAchievements(state, state.users[0].id, Date.parse('2026-11-22'))
  expect(memberAchievements(state, state.users[0].id, Date.parse('2026-11-22'))).toEqual(first)
  expect(state).toEqual(before)
})
