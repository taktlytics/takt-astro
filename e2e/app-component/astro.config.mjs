import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'

// No integration here: this app exercises the <Takt /> component install path.
// Alias the package specifiers to the built artifacts so it runs against the real
// published output (the component imports resolveOptions/buildRuntime from dist).
const dist = fileURLToPath(new URL('../../dist/index.js', import.meta.url))
const component = fileURLToPath(new URL('../../Takt.astro', import.meta.url))

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        '@vskstudio/takt-astro/Takt.astro': component,
        '@vskstudio/takt-astro': dist,
      },
    },
  },
})
