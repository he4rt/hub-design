import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  key: string
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  /** Active on another page too, such as Início on Salvos. */
  alsoActive?: boolean
  count?: number
}

export type NavGroup = { label: string; items: NavItem[] }

/** The item of the current page; one with a query (Trajetória, ?aba=trajetoria) wins over its bare path (Meu perfil). */
export function currentItem(items: NavItem[], pathname: string, search: string) {
  return items.find((item) => item.to.includes('?') && isCurrent(item, pathname, search)) ?? items.find((item) => isCurrent(item, pathname, search))
}

export function isCurrent(item: NavItem, pathname: string, search: string) {
  const [path, query] = item.to.split('?')
  if (query) return pathname === path && search.includes(query)
  return item.alsoActive || pathname === path || (!item.end && pathname.startsWith(`${path}/`))
}
