import { useSyncExternalStore } from 'react'

export type Store<T> = {
  get: () => T
  set: (update: (state: T) => T) => void
  reset: () => void
  subscribe: (listener: () => void) => () => void
}

/**
 * Minimal external store. Pass `persist` to keep the state in localStorage
 * across reloads.
 */
export function createStore<T>(initial: T, options: { persist?: string } = {}): Store<T> {
  const { persist } = options
  const listeners = new Set<() => void>()
  let state = load() ?? initial

  function load(): T | undefined {
    if (!persist) return undefined
    const raw = localStorage.getItem(persist)
    return raw ? (JSON.parse(raw) as T) : undefined
  }

  function commit(next: T) {
    state = next
    if (persist) localStorage.setItem(persist, JSON.stringify(state))
    listeners.forEach((listener) => listener())
  }

  return {
    get: () => state,
    set: (update) => commit(update(state)),
    reset: () => commit(initial),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/**
 * Reads a slice of a store. The selector must return a value that already
 * lives in the state (or a primitive): building a new array or object in the
 * selector makes `useSyncExternalStore` re-render forever.
 */
export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()))
}
