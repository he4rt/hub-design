import { Outlet, ScrollRestoration } from 'react-router'
import { DebugSidebar } from '@/debug/debug-sidebar'
import './app-shell.css'

/** Root route: the current module next to the debug sidebar. */
export function AppShell() {
  return (
    <div className="app-shell">
      <div className="app-shell__main">
        <Outlet />
      </div>
      <DebugSidebar />
      <ScrollRestoration />
    </div>
  )
}
