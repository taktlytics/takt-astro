import { describe, it, expect, vi } from 'vitest'
import takt from '../src/index'
import { resolveOptions } from '../src/options'
import { buildRuntime } from '../src/runtime'
import packageJson from '../package.json?raw'
import component from '../Takt.astro?raw'
import routeComponent from '../TaktRoute.astro?raw'

type InitConfig = { routeTemplate?: () => string | null; [key: string]: unknown }

function fakeDocument(initialRoute: string | null) {
  let route = initialRoute
  const listeners: Record<string, Array<() => void>> = {}
  return {
    setRoute(next: string | null) {
      route = next
    },
    dispatch(type: string) {
      for (const listener of listeners[type] ?? []) listener()
    },
    querySelector(selector: string) {
      if (selector !== 'meta[name="takt:route"]' || route === null) return null
      return { getAttribute: (name: string) => (name === 'content' ? route : null) }
    },
    addEventListener(type: string, listener: () => void) {
      ;(listeners[type] ??= []).push(listener)
    },
  }
}

function boot(runtime: string, document: ReturnType<typeof fakeDocument>) {
  const body = runtime.replace(/^import .*$/m, '')
  let config: InitConfig = {}
  const init = vi.fn((options: InitConfig) => {
    config = options
  })
  const seen: Array<string | null | undefined> = []
  const pageview = vi.fn(() => {
    seen.push(config.routeTemplate?.())
  })
  new Function('init', 'pageview', 'window', 'document', body)(init, pageview, {}, document)
  return { init, pageview, seen, config: () => config }
}

function injected(options: Parameters<typeof takt>[0]): string {
  const injectScript = vi.fn()
  takt(options).hooks['astro:config:setup']?.({ injectScript } as never)
  return injectScript.mock.calls[0][1] as string
}

describe('route redaction options', () => {
  it('forwards redactRoutes and routeTemplates through resolveOptions', () => {
    const r = resolveOptions({ redactRoutes: ['/verify/[token]'], routeTemplates: true })
    expect(r.redactRoutes).toEqual(['/verify/[token]'])
    expect(r.routeTemplates).toBe(true)
  })

  it('leaves both options undefined by default', () => {
    const r = resolveOptions()
    expect(r.redactRoutes).toBeUndefined()
    expect(r.routeTemplates).toBeUndefined()
  })

  it('serializes redactRoutes and routeTemplates into the injected runtime', () => {
    const content = injected({ redactRoutes: ['/verify/[token]'], routeTemplates: true })
    expect(content).toContain('"redactRoutes":["/verify/[token]"]')
    expect(content).toContain('"routeTemplates":true')
  })
})

describe('route template resolver in the runtime', () => {
  it('passes no resolver to core when routeTemplates is off', () => {
    const doc = fakeDocument('/blog/[slug]')
    const { config } = boot(buildRuntime(resolveOptions({ redactRoutes: ['/verify/[token]'] })), doc)
    expect(config().routeTemplate).toBeUndefined()
    expect(config().redactRoutes).toEqual(['/verify/[token]'])
  })

  it('reads the takt:route meta when routeTemplates is on', () => {
    const doc = fakeDocument('/blog/[slug]')
    const { config, seen } = boot(buildRuntime(resolveOptions({ routeTemplates: true })), doc)
    expect(typeof config().routeTemplate).toBe('function')
    expect(seen).toEqual(['/blog/[slug]'])
  })

  it('returns null when the page has no takt:route meta', () => {
    const doc = fakeDocument(null)
    const { seen } = boot(buildRuntime(resolveOptions({ routeTemplates: true })), doc)
    expect(seen).toEqual([null])
  })

  it('reads the meta of the new page on a ClientRouter navigation', () => {
    const doc = fakeDocument('/blog/[slug]')
    const { seen, pageview } = boot(buildRuntime(resolveOptions({ routeTemplates: true })), doc)
    doc.setRoute('/docs/[...path]')
    doc.dispatch('astro:after-swap')
    expect(pageview).toHaveBeenCalledTimes(2)
    expect(seen).toEqual(['/blog/[slug]', '/docs/[...path]'])
  })

  it('keeps scrubUrl alongside the resolver', () => {
    const doc = fakeDocument('/blog/[slug]')
    const runtime = buildRuntime(resolveOptions({ routeTemplates: true }), (u) => u.split('#')[0])
    const { config } = boot(runtime, doc)
    expect(typeof config().scrubUrl).toBe('function')
    expect(typeof config().routeTemplate).toBe('function')
  })

  it('keeps the runtime free of a literal closing script tag', () => {
    const content = injected({ routeTemplates: true, domain: '</script>' })
    expect(content).not.toContain('</script>')
  })
})

describe('Astro components', () => {
  const pkg = JSON.parse(packageJson)

  it('ships and exports TaktRoute.astro', () => {
    expect(pkg.exports['./TaktRoute.astro']).toBe('./TaktRoute.astro')
    expect(pkg.files).toContain('TaktRoute.astro')
  })

  it('renders the route meta from Astro.routePattern only when it is defined', () => {
    expect(routeComponent).toContain('Astro.routePattern')
    expect(routeComponent).toContain('<meta name="takt:route"')
  })

  it('lets <Takt /> render the route meta and wire the resolver when routeTemplates is on', () => {
    expect(component).toContain('Astro.routePattern')
    expect(component).toContain('<meta name="takt:route"')
    expect(component).toContain(`document.querySelector('meta[name="takt:route"]')`)
  })
})
