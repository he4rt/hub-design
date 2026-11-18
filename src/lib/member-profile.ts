import type {
  AccountOrigin,
  Area,
  LinkedProvider,
  Objective,
  ProfileField,
  Situation,
  SocialProvider,
  StartingPoint,
} from '@/mocks/db'
import type { ProfileAction } from '@/mocks/profile-completeness'

export const AREAS: { value: Area; label: string }[] = [
  { value: 'front-end', label: 'Front-end' },
  { value: 'back-end', label: 'Back-end' },
  { value: 'full-stack', label: 'Full-stack' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'qa', label: 'QA' },
  { value: 'devops', label: 'DevOps' },
  { value: 'data-ai', label: 'Dados/IA' },
  { value: 'cybersec', label: 'Cybersec' },
]

export const STARTING_POINTS: { value: StartingPoint; label: string }[] = [
  { value: 'beginner', label: 'Estou começando' },
  { value: 'junior', label: 'Júnior' },
  { value: 'mid', label: 'Pleno' },
  { value: 'senior', label: 'Sênior' },
]

export const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'PHP', 'C#', 'Go', 'Rust', 'Kotlin', 'Swift', 'Dart',
  'Ruby', 'Elixir', 'C', 'C++', 'Scala', 'R', 'SQL', 'Lua', 'Clojure', 'Haskell', 'Zig', 'Shell',
]

export const LANGUAGES_MAX = 5

export const OBJECTIVES: { value: Objective; label: string; description: string }[] = [
  { value: 'learn', label: 'Aprender', description: 'Estudar e montar a base.' },
  { value: 'get-job', label: 'Conseguir trabalho', description: 'Me preparar para entrar ou voltar ao mercado.' },
  { value: 'grow', label: 'Evoluir onde estou', description: 'Crescer no trabalho que já tenho.' },
]

export const SITUATIONS: { value: Situation; label: string }[] = [
  { value: 'working', label: 'Trabalhando' },
  { value: 'seeking', label: 'Procurando trabalho' },
  { value: 'studying', label: 'Estudando' },
]

/** Providers that sign a member in. */
export const PROVIDERS: { value: SocialProvider; label: string }[] = [
  { value: 'discord', label: 'Discord' },
  { value: 'github', label: 'GitHub' },
  { value: 'google', label: 'Google' },
]

/** Accounts listed in the settings, in this order. */
export const LINKED_PROVIDERS: { value: LinkedProvider; label: string }[] = [
  { value: 'github', label: 'GitHub' },
  { value: 'discord', label: 'Discord' },
  { value: 'google', label: 'Google' },
  { value: 'linkedin', label: 'LinkedIn' },
]

export const LOGIN_PROVIDERS: LinkedProvider[] = ['discord', 'github', 'google']

/** Where an account was created, with its preposition: "criada na Basement". */
export const ORIGIN_IN: Record<AccountOrigin, string> = {
  hub: 'no He4rt Hub',
  basement: 'na Basement',
  'job-finder': 'no Job Finder',
}

export const PROFILE_FIELD_LABELS: Record<ProfileField, string> = {
  areas: 'Áreas',
  startingPoint: 'Ponto de partida',
  languages: 'Linguagens',
  situation: 'Situação',
  city: 'Cidade',
  photo: 'Foto',
  bio: 'Bio',
  github: 'GitHub vinculado',
  linkedin: 'LinkedIn vinculado',
  portfolio: 'Portfólio',
}

export const ACTION_LABELS: Record<ProfileAction, string> = {
  'join-squad': 'Entrar em squad',
  'apply-job': 'Candidatar a vaga',
}

/** Sign-up minimum age. */
export const MIN_AGE = 18

export function labelOf<T extends string>(options: { value: T; label: string }[], value: T | null): string {
  return options.find((option) => option.value === value)?.label ?? ''
}

export function areaLabels(areas: Area[]): string {
  return areas.map((area) => labelOf(AREAS, area)).join(', ')
}

/** Age in whole years on the day of `now`; NaN for an invalid date. */
export function ageOn(birthDate: string, now: number): number {
  const birth = new Date(`${birthDate}T00:00:00`)
  const today = new Date(now)
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  return today.getFullYear() - birth.getFullYear() - (beforeBirthday ? 1 : 0)
}
