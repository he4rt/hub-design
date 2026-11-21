import { fileURLToPath } from 'node:url'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { relative } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/** Modules whose actions run on the API (server/actions.ts reads the same list). */
const ACTION_MODULE = /^src\/(modules\/.+\/actions|mocks\/github)\.ts$/

/**
 * Wraps every exported function of an actions module with `remote` (src/mocks/api.ts), so
 * `mockAction` sends the call to the API instead of running the handler in the browser.
 */
function remoteActions(): Plugin {
  const root = fileURLToPath(new URL('.', import.meta.url))
  return {
    name: 'hub-remote-actions',
    transform(code, id) {
      const file = relative(root, id.split('?')[0])
      if (!ACTION_MODULE.test(file)) return
      const names = [...code.matchAll(/^export function (\w+)/gm)].map((match) => match[1])
      const module = file.replace(/^src\//, '').replace(/\.ts$/, '')
      const wraps = names.map((name) => `${name} = __remote(${JSON.stringify(module)}, ${JSON.stringify(name)}, ${name})`)
      return `${code}\nimport { remote as __remote } from '@/mocks/api'\n${wraps.join('\n')}\n`
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    remoteActions(),
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // The API (server/) runs beside Vite; one origin keeps its session cookies first-party.
  server: {
    proxy: { '/api': `http://127.0.0.1:${process.env.API_PORT ?? 3001}` },
  },
})
