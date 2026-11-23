import { normalizeText } from '@/lib/text'

/** Stand-in for the automatic moderation service, shared by publications and forum conversations. */
const BLOCKED_TERMS = ['idiota', 'imbecil', 'otario', 'retardado', 'lixo humano']

export function findBlockedTerm(text: string): string | null {
  const normalized = normalizeText(text)
  return BLOCKED_TERMS.find((term) => new RegExp(`\\b${term}\\b`).test(normalized)) ?? null
}
