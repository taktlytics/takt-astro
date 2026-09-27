import { describe, it, expect, vi } from 'vitest'
import takt, * as api from '../src/index'
import { takt as namedTakt } from '../src/integration'
import { resolveOptions, assertNoScrubUrl } from '../src/options'
import { buildRuntime } from '../src/runtime'

function setup(options?: Parameters<typeof takt>[0]) {
  const integration = takt(options)
  const injectScript = vi.fn()
  integration.hooks['astro:config:setup']?.({ injectScript } as never)
  return { integration, injectScript, content: injectScript.mock.calls[0]?.[1] as string }
}

describe('public API surface', () => {
  it('re-exports the consent functions from core', () => {
    expect(typeof api.optOut).toBe('function')
    expect(typeof api.optIn).toBe('function')
    expect(typeof api.isOptedOut).toBe('function')
  })
})

describe('takt integration object', () => {
  it('is a default export and a named export pointing to the same factory', () => {
    expect(takt).toBe(namedTakt)
  })

  it('has the conventional integration name', () => {
    expect(takt().name).toBe('@vskstudio/takt-astro')
  })

  it('registers the astro:config:setup hook', () => {
    const hooks = takt().hooks
    expect(typeof hooks['astro:config:setup']).toBe('function')
  })

  it('does not register unrelated hooks', () => {
    expect(Object.keys(takt().hooks)).toEqual(['astro:config:setup'])
  })

  it('calls injectScript once on the page stage', () => {
    const { injectScript } = setup()
    expect(injectScript).toHaveBeenCalledTimes(1)
    expect(injectScript.mock.calls[0][0]).toBe('page')
  })
})

describe('injected runtime content', () => {
  it('imports init from core', () => {
    const { content } = setup()
    expect(content).toContain("from '@vskstudio/takt-core'")
    expect(content).toContain('init')
  })

  it('embeds the user domain and endpoint', () => {
    const { content } = setup({ domain: 'example.com', endpoint: '/collect' })
    expect(content).toContain('"domain":"example.com"')
    expect(content).toContain('"endpoint":"/collect"')
  })

  it('embeds scriptOrigin so core can derive the first-party endpoint', () => {
    const { content } = setup({ scriptOrigin: 'https://t.example.com' })
    expect(content).toContain('"scriptOrigin":"https://t.example.com"')
  })

  it('drives SPA pageviews from astro:after-swap, never core history patching', () => {
    const { content } = setup()
    // Core's history patch over-counts under Astro (ClientRouter runs several
    // history ops per nav), so auto is forced off and after-swap is the SPA
    // source — exactly one pageview per navigation, and never page-load.
    expect(content).toContain('init(o)')
    expect(content).toContain('"auto":false')
    expect(content).toContain("astro:after-swap")
    expect(content).not.toContain('astro:page-load')
  })

  it('guards against SSR/prerender (no window)', () => {
    const { content } = setup()
    expect(content).toContain("typeof window !== 'undefined'")
  })

  it('guards against double-init across paths', () => {
    const { content } = setup()
    expect(content).toContain('window.__takt')
  })

  it('fires the initial pageview explicitly (auto disabled)', () => {
    const { content } = setup()
    // auto is off, so init() does not fire the initial view; the runtime does.
    expect(content).toContain('init(o)')
    expect(content).toContain('pageview();')
  })

  it('omits the SPA listener when spa is disabled', () => {
    const { content } = setup({ spa: false })
    expect(content).toContain('pageview();')
    expect(content).not.toContain('astro:after-swap')
  })
})

describe('option resolution & defaults', () => {
  it('applies documented defaults', () => {
    expect(resolveOptions()).toMatchObject({
      outbound: false,
      files: false,
      notFound: false,
      respectDnt: true,
      excludeLocalhost: true,
      auto: true,
    })
  })

  it('maps spa:false to core auto:false', () => {
    expect(resolveOptions({ spa: false }).auto).toBe(false)
  })

  it('respects explicit privacy overrides', () => {
    const r = resolveOptions({ respectDnt: false, excludeLocalhost: false })
    expect(r.respectDnt).toBe(false)
    expect(r.excludeLocalhost).toBe(false)
  })

  it('forwards outbound and files toggles', () => {
    const r = resolveOptions({ outbound: true, files: true })
    expect(r.outbound).toBe(true)
    expect(r.files).toBe(true)
  })

  it('maps track404 to core notFound, only when enabled', () => {
    expect(resolveOptions().notFound).toBe(false)
    expect(resolveOptions({ track404: true }).notFound).toBe(true)
  })

  it('always serializes auto:false in the runtime (Astro drives pageviews itself)', () => {
    const { content } = setup()
    expect(content).toContain('"auto":false')
  })
})

describe('advanced tracker options', () => {
  it('serializes scalar advanced options into the JSON passed to init', () => {
    const { content } = setup({
      sampleRate: 0.5,
      trackQuery: true,
      queryParams: ['utm_source'],
      enabled: false,
      tagged: true,
    })
    expect(content).toContain('"sampleRate":0.5')
    expect(content).toContain('"trackQuery":true')
    expect(content).toContain('"queryParams":["utm_source"]')
    expect(content).toContain('"enabled":false')
    expect(content).toContain('"tagged":true')
  })

  it('serializes debug into the JSON passed to init', () => {
    const { content } = setup({ debug: true })
    expect(content).toContain('"debug":true')
  })

  it('forwards debug through resolveOptions', () => {
    expect(resolveOptions({ debug: true }).debug).toBe(true)
    expect(resolveOptions().debug).toBeUndefined()
  })

  it('forwards scalar advanced options through resolveOptions', () => {
    const r = resolveOptions({
      sampleRate: 0.5,
      trackQuery: true,
      queryParams: ['utm_source'],
      enabled: false,
      tagged: true,
    })
    expect(r.sampleRate).toBe(0.5)
    expect(r.trackQuery).toBe(true)
    expect(r.queryParams).toEqual(['utm_source'])
    expect(r.enabled).toBe(false)
    expect(r.tagged).toBe(true)
  })

  it('injects scrubUrl as raw JS outside the JSON via Object.assign', () => {
    const { content } = setup({ scrubUrl: (u) => u.split('#')[0] })
    // Raw function source is appended outside the JSON object literal.
    expect(content).toContain('Object.assign(')
    expect(content).toMatch(/scrubUrl:\s*\(u\)\s*=>\s*u\.split\("#"\)\[0\]/)
    // The JSON portion is still <-escaped (no literal `<` reaches the HTML parser
    // here, but the escaping pipeline must remain on the JSON half).
    expect(content).not.toContain('</script>')
  })

  it('keeps the JSON <-escaping intact when scrubUrl is injected alongside a domain', () => {
    const { content } = setup({
      domain: '</script><x>',
      scrubUrl: (u) => u,
    })
    expect(content).toContain('\\u003c')
    expect(content).not.toContain('</script>')
    expect(content).toContain('Object.assign(')
  })

  it('never emits a scrubUrl key inside the JSON object', () => {
    const { content } = setup({ scrubUrl: (u) => u.split('#')[0] })
    const json = content.match(/Object\.assign\((\{.*?\}),/s)?.[1]
    expect(json).toBeDefined()
    expect(json).not.toContain('scrubUrl')
    expect(json).not.toContain('"scrubUrl"')
  })

  it('does not put scrubUrl into the JSON-bound resolved options', () => {
    const r = resolveOptions({ scrubUrl: (u) => u })
    expect('scrubUrl' in r).toBe(false)
  })

  it('emits a plain init(<json>) when scrubUrl is absent', () => {
    const { content } = setup({ sampleRate: 0.25 })
    expect(content).not.toContain('Object.assign(')
    expect(content).toContain('init(o)')
  })
})

// The <Takt /> component (Takt.astro) calls assertNoScrubUrl in its frontmatter
// before serializing props as a JSON data island. The component itself can't be
// rendered in this node/vitest harness (it's exercised by Playwright in e2e/),
// so the guard is unit-tested here directly via the helper the component calls.
describe('component scrubUrl guard (assertNoScrubUrl)', () => {
  it('throws when scrubUrl is provided, pointing to the integration', () => {
    expect(() => assertNoScrubUrl({ scrubUrl: (u) => u })).toThrow(/scrubUrl/)
    expect(() => assertNoScrubUrl({ scrubUrl: (u) => u })).toThrow(/integration/)
  })

  it('passes for the empty options object and undefined', () => {
    expect(() => assertNoScrubUrl()).not.toThrow()
    expect(() => assertNoScrubUrl({})).not.toThrow()
  })

  it('passes when other options are present but scrubUrl is absent', () => {
    expect(() => assertNoScrubUrl({ domain: 'example.com', sampleRate: 0.5 })).not.toThrow()
  })
})

describe('injection safety', () => {
  it('escapes a domain that tries to break out of the string literal', () => {
    const evil = '";evil()//'
    const content = buildRuntime(resolveOptions({ domain: evil }))
    // The quote is escaped, so the value stays trapped inside the JSON string
    // literal and cannot terminate it to inject a bare statement.
    expect(content).toContain('\\";evil()//')
    expect(content).toContain(JSON.stringify(evil))
    // Sanity: the serialized options round-trip back to the original value.
    const o = JSON.parse(content.match(/const o = (\{.*\});/)![1])
    expect(o.domain).toBe(evil)
  })

  it('escapes a </script> breakout in the domain (no literal closing tag emitted)', () => {
    const evil = '</script><script>alert(1)</script>'
    const content = buildRuntime(resolveOptions({ domain: evil }))
    // `<` is escaped, so no literal `</script>` (or other tag) reaches the HTML parser.
    expect(content).toContain('\\u003c')
    expect(content).not.toContain('</script>')
    expect(content).not.toContain('<script>')
    // The value still round-trips to the original at runtime (JSON.parse decodes \uXXXX).
    const o = JSON.parse(content.match(/const o = (\{.*\});/)![1])
    expect(o.domain).toBe(evil)
  })

  it('produces runtime parseable as a module body (balanced braces)', () => {
    const { content } = setup({ domain: 'a.com' })
    const opens = (content.match(/\{/g) || []).length
    const closes = (content.match(/\}/g) || []).length
    expect(opens).toBe(closes)
  })
})
