# Conquistas: entidades do mock

Tipos que o banco fake (`src/mocks/db.ts`) usa, espelhando as Data classes do Laravel. Datas em ISO 8601.
Catálogo em [`spec.md`](./spec.md); regras em [`validation.md`](./validation.md).

## Catálogo: `AchievementDefinition`

Configuração do backend, igual para todos os membros. No mock fica em `src/mocks/achievements.ts`, fora do
estado persistido, porque não muda por ação do usuário.

```ts
type AchievementGroup =
  | 'arrival'
  | 'trajectory'
  | 'diary'
  | 'entry-test'
  | 'squads'
  | 'validation'
  | 'community'
  | 'tenure'
  | 'market'
  | 'manual'

type AchievementDefinition = {
  /** Stable id, such as `git-init`. */
  key: string
  /** Position in the catalog, 1 to 86. */
  number: number
  group: AchievementGroup
  name: string
  /** How it unlocks, in the member's words. */
  description: string
  /** Event that triggers the check; null for derived and manual ones. */
  event: string | null
  stage: 'foundation' | 'squads' | 'jobs' | 'manual' | 'later'
  /** Documents the milestone the access checklist repeats. Never read by access rules. */
  access: 'floor' | 'job' | 'decision' | 'none'
  /** Follows the visibility of the record that unlocked it. */
  private: boolean
  /** Granted by the administration only. */
  manual: boolean
  /** Short mark drawn on the medal, such as `init` or `PR`. */
  glyph: string
}
```

## Conquista do membro: `MemberAchievement`

```ts
type MemberAchievement = {
  id: string
  userId: string
  key: string
  /** When the fact happened, not when the check ran. */
  unlockedAt: string
  /** 1 for every achievement; the year count for `one-year-hub`. */
  occurrence: number
  source: 'platform' | 'administration'
  /** Administration only. */
  grantedBy: string | null
  grantReason: string | null
  /** The record that unlocked it, so a private achievement follows its visibility. */
  origin: { type: 'trajectory-record' | 'feed-post' | 'delivery' | 'validation' | 'squad' | 'entry-test' | 'account'; id: string } | null
  /** The member chose to show it. Private achievements also need `origin` published. */
  isPublic: boolean
  revokedAt: string | null
  revokedBy: string | null
  revokeReason: string | null
}
```

`MockDb` ganha `memberAchievements: MemberAchievement[]`. A chave do localStorage sobe de
`he4rt:mock-db:v6` para `v7`.

**Simplificação no mock atual:** enquanto os registros de squad e validação do membro não existem no banco
fake, o mock guarda `originPublic: boolean` no lugar de `origin`, e ainda não tem `occurrence`, `grantedBy`,
`revokedBy` nem `revokeReason`. Esses campos entram junto com as ações de conceder e revogar.

## Estágio: derivado, sem tabela

```ts
type JourneyStage = 'member' | 'prepared' | 'practicing' | 'delivered' | 'validated'

type MemberJourney = {
  stage: JourneyStage
  contributor: boolean
}
```

Calculado na leitura (ver `validation.md`). No mock, enquanto squads e validação não têm entidades próprias
do membro, o seed de cada perfil declara os marcos em `MemberProfile.journey`:

```ts
type MemberProfile = {
  // ...campos atuais
  journey: {
    /** Highest stage the member reached. */
    stage: JourneyStage
    /** Highest stage the member published; what visitors see. */
    publicStage: JourneyStage
    contributor: boolean
  }
}
```

Quando os squads e a validação entrarem no mock, `journey` sai do seed e passa a ser calculado dos
registros.

## Ações mockadas

| Ação | Função | Quem |
| --- | --- | --- |
| `panel-app.profile.achievements.update` | `setAchievementVisibility` | O dono da conquista |
| `panel-admin.members.achievements.store` | `grantAchievement` | Admin |
| `panel-admin.members.achievements.destroy` | `revokeAchievement` | Admin |

## Eventos

`achievement_unlocked`, `achievement_granted`, `achievement_published`, `achievement_unpublished`,
`achievement_revoked`. Props: `key`, `group`, `source`; nunca dados pessoais.

## Seed

| Membro | Estágio | Conquistas |
| --- | --- | --- |
| Ana Souza (`ana-souza`) | Com entrega, contribuidora não | Muitas, de chegada, trajetória, diário, teste de entrada e squad; algumas privadas e uma manual |
| Bruno Lima (`bruno-lima`) | Membro | Só `git-init` |
