/** Lowercase without accents, for matching what someone types. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** URL-safe handle from a name: "João Silva" → "joao-silva". */
export function slugify(text: string, maxLength = 30): string {
  return normalizeText(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
}
