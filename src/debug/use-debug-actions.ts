import { useEffect, useId } from 'react'
import { setDebugGroup, type DebugAction } from './debug-store'

/**
 * Registers the current screen's actions in the debug sidebar while the
 * calling component is mounted. Call it once per page (and optionally in
 * layouts); each call shows up as its own group.
 */
export function useDebugActions(title: string, actions: DebugAction[]) {
  const id = useId()

  useEffect(() => {
    setDebugGroup(id, { title, actions })
  }, [id, title, actions])

  useEffect(() => () => setDebugGroup(id, null), [id])
}
