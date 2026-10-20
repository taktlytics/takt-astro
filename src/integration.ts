import type { AstroIntegration } from 'astro'
import { resolveOptions, type TaktOptions } from './options'
import { buildRuntime } from './runtime'

/** Pick ONE install path: this integration OR the `<Takt />` component, not both. */
export default function takt(options: TaktOptions = {}): AstroIntegration {
  const runtime = buildRuntime(resolveOptions(options), options.scrubUrl)
  return {
    name: '@vskstudio/takt-astro',
    hooks: {
      'astro:config:setup': ({ injectScript }) => {
        injectScript('page', runtime)
      },
    },
  }
}

export { takt }
