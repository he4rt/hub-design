import { migrateFresh, transaction } from './connection'
import { writeState } from './write-state'

/**
 * `bun run db:fresh`: recreates every table and loads the prototype's seed, the same data the
 * screens start with (src/mocks/db.ts). Every password is the prototype's `password`.
 */
export async function seed() {
  await import('../runtime')
  const { seedState } = await import('@/mocks/db')
  migrateFresh()
  transaction(() => writeState(seedState))
}

if (import.meta.main) {
  await seed()
  console.log('Banco recriado com o seed do protótipo.')
}
