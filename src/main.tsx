import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import '@/styles/base.css'
import { startTheme } from '@/lib/theme'
import { loadServerState } from '@/mocks/api'
import { router } from '@/router'

startTheme()

// The first state comes from the API before anything renders, like the props of an Inertia page.
await loadServerState()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
