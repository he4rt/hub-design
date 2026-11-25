import { Braces, Castle, Compass, Flame, GitBranch, Star, Terminal, Zap, type LucideIcon } from 'lucide-react'

/*
 * Crest of a squad (design POC, hypothesis H8): a shape and a line symbol in one of the metro colors that
 * the design system gives squad branches in the trajectory.
 */

export const CREST_SHAPES = [
  { id: 'shield', label: 'Escudo', d: 'M5 4H43V27C43 41 34 49 24 53C14 49 5 41 5 27Z' },
  { id: 'banner', label: 'Estandarte', d: 'M7 4H41V52L24 43L7 52Z' },
  { id: 'hexagon', label: 'Hexágono', d: 'M24 3L44 15V41L24 53L4 41V15Z' },
  { id: 'diamond', label: 'Losango', d: 'M24 3L45 28L24 53L3 28Z' },
  { id: 'circle', label: 'Círculo', d: 'M24 6A22 22 0 1 1 23.99 6Z' },
] as const

export const CREST_SYMBOLS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: 'braces', label: 'Chaves', Icon: Braces },
  { id: 'terminal', label: 'Terminal', Icon: Terminal },
  { id: 'branch', label: 'Branch', Icon: GitBranch },
  { id: 'bolt', label: 'Raio', Icon: Zap },
  { id: 'flame', label: 'Chama', Icon: Flame },
  { id: 'compass', label: 'Bússola', Icon: Compass },
  { id: 'tower', label: 'Torre', Icon: Castle },
  { id: 'star', label: 'Estrela', Icon: Star },
]

/** The metro colors of the trajectory: the squad's branch in the Graph uses the same one. */
export const CREST_COLORS = [
  { id: 1, label: 'Azul' },
  { id: 2, label: 'Verde' },
  { id: 3, label: 'Laranja' },
  { id: 4, label: 'Rosa' },
  { id: 5, label: 'Amarelo' },
  { id: 6, label: 'Petróleo' },
  { id: 7, label: 'Marrom' },
] as const

export type Crest = { shape: (typeof CREST_SHAPES)[number]['id']; symbol: string; color: number }

export function crestLabel(crest: Crest) {
  const shape = CREST_SHAPES.find((s) => s.id === crest.shape)?.label ?? ''
  const symbol = CREST_SYMBOLS.find((s) => s.id === crest.symbol)?.label ?? ''
  const color = CREST_COLORS.find((c) => c.id === crest.color)?.label ?? ''
  return `Brasão: ${shape.toLowerCase()} ${color.toLowerCase()} com ${symbol.toLowerCase()}`
}
