/*
 * Imported before anything from src/: the action modules run here as they would on the backend.
 * `mockAction` runs the handler instead of calling the API, and the browser globals the debug
 * store reads at load time get inert stand-ins.
 */
Object.assign(globalThis, {
  __HUB_SERVER__: true,
  window: { matchMedia: () => ({ matches: false }) },
})
