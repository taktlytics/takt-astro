import type { InitOptions } from '@vskstudio/takt-core'

const ROUTE_TEMPLATE_RESOLVER = `() => document.querySelector('meta[name="takt:route"]')?.getAttribute('content') ?? null`

/**
 * Build the browser runtime that boots Takt.
 *
 * Returned as a source string because Astro's `injectScript` and the `<Takt />`
 * component both take a raw module body.
 *
 * `scrubUrl` is threaded separately because it is a function: `JSON.stringify`
 * would silently drop it, so it is embedded as raw JS via `.toString()` instead.
 */
export function buildRuntime(options: InitOptions, scrubUrl?: (url: string) => string): string {
  // SPA tracking is requested unless core's `auto` was explicitly disabled.
  const spa = options.auto !== false
  // `<` is escaped so a domain/endpoint containing `</script>` (or `<!--`) cannot
  // terminate the inline `<script>` tag or open a comment in the emitted HTML —
  // JSON.stringify alone does not escape `/`, and the HTML parser stops at a
  // literal `</script>` regardless of JS string context. JSON.parse ignores the
  // `\uXXXX` escapes, so the values round-trip unchanged at runtime.
  // `auto` is forced off: Astro's ClientRouter runs several history operations per
  // navigation (scroll-restoration replaceState + pushState), so core's history
  // patch would emit several pageviews per nav. We drive pageviews from Astro's
  // own lifecycle instead — see below.
  const json = JSON.stringify({ ...options, auto: false })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
  // `scrubUrl` is a function, so it bypasses the JSON above and is stitched in as
  // raw JS via `.toString()`. It MUST be self-contained (no closure/outer-scope
  // references): it is stringified here at build time and re-evaluated in the
  // browser, where the surrounding scope no longer exists.
  const functions = [
    ...(scrubUrl ? [`scrubUrl: ${scrubUrl.toString()}`] : []),
    ...(options.routeTemplates ? [`routeTemplate: ${ROUTE_TEMPLATE_RESOLVER}`] : []),
  ]
  const config = functions.length ? `Object.assign(${json}, { ${functions.join(', ')} })` : json
  return [
    `import { init, pageview } from '@vskstudio/takt-core';`,
    // SSR/prerender guard: this module is evaluated under Node when Astro
    // prerenders, where window/init's browser APIs are absent.
    `if (typeof window !== 'undefined' && !window.__takt) {`,
    `  const o = ${config};`,
    // Idempotent across both entry paths (integration + <Takt/>): the flag stops
    // a second boot from re-registering listeners or re-firing the initial view.
    `  window.__takt = true;`,
    `  init(o);`,
    // One initial pageview (also covers full-page MPA loads, where the script
    // re-runs per navigation and astro:after-swap never fires).
    `  pageview();`,
    // astro:after-swap fires exactly once per ClientRouter navigation (incl.
    // back/forward), giving one pageview per nav with no double-count.
    ...(spa ? [`  document.addEventListener('astro:after-swap', () => pageview());`] : []),
    `}`,
  ].join('\n')
}
