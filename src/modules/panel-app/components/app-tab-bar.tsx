import { useState } from 'react'
import { Menu } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import { isCurrent, type NavGroup } from '@/modules/panel-app/lib/nav'
import './app-tab-bar.css'

/** The four destinations a member opens every day; the rest of the navigation lives under "Mais". */
const TABS = ['home', 'forum', 'squads', 'profile']

/**
 * Bottom navigation on a phone, within reach of the thumb. It takes the sidebar's groups: the daily
 * destinations become tabs and the others open in the "Mais" sheet, with the same counts.
 */
export function AppTabBar({ groups }: { groups: NavGroup[] }) {
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(false)
  const items = groups.flatMap((group) => group.items)
  const tabs = TABS.flatMap((key) => items.filter((item) => item.key === key))
  const more = groups
    .map((group) => ({ ...group, items: group.items.filter((item) => !TABS.includes(item.key)) }))
    .filter((group) => group.items.length > 0)
  const moreItems = more.flatMap((group) => group.items)
  const moreCount = moreItems.reduce((sum, item) => sum + (item.count ?? 0), 0)
  // On the profile, Trajetória (?aba=trajetoria) is the more precise match than Meu perfil.
  const moreActive = moreItems.some((item) => isCurrent(item, pathname, search))

  return (
    <nav className="app-tab-bar" aria-label="Navegação principal">
      {tabs.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          end={item.end}
          className={({ isActive }) => cn('app-tab-bar__item', (isActive || item.alsoActive) && !moreActive && 'active')}
        >
          <item.icon size={22} aria-hidden />
          <span>{item.label}</span>
        </NavLink>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button type="button" className={cn('app-tab-bar__item', moreActive && 'active')}>
            <span className="app-tab-bar__icon">
              <Menu size={22} aria-hidden />
              {moreCount > 0 && <span className="app-tab-bar__dot" aria-hidden />}
            </span>
            <span>Mais</span>
            {moreCount > 0 && <span className="app-tab-bar__sr">, {moreCount} pendentes</span>}
          </button>
        </DialogTrigger>
        <DialogContent title="Mais" description="Outras áreas do Hub." className="app-tab-bar__sheet">
          {more.map((group) => (
            <section key={group.label} className="app-tab-bar__group" aria-label={group.label}>
              <h2>{group.label}</h2>
              {group.items.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  end={item.end}
                  className={() => cn('app-tab-bar__link', isCurrent(item, pathname, search) && 'active')}
                  onClick={() => setOpen(false)}
                >
                  <item.icon size={18} aria-hidden />
                  <span>{item.label}</span>
                  {!!item.count && <Badge variant="count">{item.count}</Badge>}
                </NavLink>
              ))}
            </section>
          ))}
        </DialogContent>
      </Dialog>
    </nav>
  )
}
