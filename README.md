# @vskstudio/takt-astro


> 📚 **Documentation** — [taktlytics.com/docs/wrappers/astro](https://taktlytics.com/docs/wrappers/astro)

Astro integration for [Takt](https://github.com/vskstudio/takt-core), privacy-friendly analytics. It injects a tiny browser runtime that boots Takt, fires the initial pageview, and tracks client-side navigations — including [Astro View Transitions](https://docs.astro.build/en/guides/view-transitions/).

## Install

```sh
pnpm add @vskstudio/takt-astro @vskstudio/takt-core
```

Both are peer dependencies: `astro` (`>=4`) and `@vskstudio/takt-core` (`>=0.10.0`).

## Usage

Pick **one** of the two paths below — not both. Both boot core's default instance, guarded by a shared `window.__takt` flag: installing both does not double-count (the second boot is skipped), but it ships the runtime twice for nothing.

### Integration (recommended)

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import takt from '@vskstudio/takt-astro'

export default defineConfig({
  integrations: [takt({ domain: 'example.com' })],
})
```

### `<Takt />` component

For per-layout control, place the component in a layout `<head>`:

```astro
---
import Takt from '@vskstudio/takt-astro/Takt.astro'
---
<head>
  <Takt domain="example.com" />
</head>
```

## Options

Both the integration and the component accept the same options, with one exception: `scrubUrl` is a function and works **only via the integration** (see the note below).

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `domain` | `string` | `location.hostname` | Site identifier sent with every event. |
| `endpoint` | `string` | `https://taktlytics.com/api/event` | Ingestion endpoint. Pass `/api/event` for a same-origin first-party proxy. |
| `scriptOrigin` | `string` | – | First-party origin to derive the endpoint from (`{origin}/api/event`) — your Takt domain or a custom domain to dodge ad-blockers (endpoint wins over it). |
| `outbound` | `boolean` | `false` | Auto-track outbound link clicks. |
| `files` | `boolean` | `false` | Auto-track file downloads, using core's default extension list (this integration does not expose an extension override). |
| `track404` | `boolean` | `false` | Report a `404` event when the page is an error page (`[data-takt-404]` / `<meta name="takt:404">` marker, or a 404 HTTP status). |
| `spa` | `boolean` | `true` | Track client-side navigations. |
| `respectDnt` | `boolean` | `true` | Suppress events when Do Not Track is on. |
| `excludeLocalhost` | `boolean` | `true` | Suppress events on localhost / private IPs. |
| `enabled` | `boolean` | `true` | Master kill switch — set `false` to suppress every event. |
| `sampleRate` | `number` | `1` | Fraction of visitors to track, `0`–`1`. |
| `trackQuery` | `boolean` | `false` | Keep the full query string and hash instead of stripping them. Wins over `queryParams`. |
| `queryParams` | `string[]` | – | Allowlist of query params to keep, applied only when `trackQuery` is off. |
| `exclude` | `string[]` | – | Path prefixes never tracked, e.g. `['/app', '/account']` (segment-bounded, checked at send time). |
| `redactRoutes` | `string[]` | none | Route patterns sent in place of the real path, e.g. `['/verify/[token]']` sends `/verify/[token]` instead of `/verify/abc123`. See [Route redaction](#route-redaction). |
| `routeTemplates` | `boolean` | `false` | Send every page as its Astro route template (`/blog/[slug]`), read from `Astro.routePattern`. Needs Astro 5 and the route meta, see [Route redaction](#route-redaction). |
| `scrubUrl` | `(url: string) => string` | – | **Integration only.** Rewrite each URL before it is sent (page, referrer, and the `url` prop of outbound-link and file-download events), e.g. to strip a fragment or PII. See the note below. |
| `tagged` | `boolean` | `false` | Auto-track clicks on `[data-takt-event]` elements; `data-takt-prop-*` attributes become event props. |
| `debug` | `boolean` | `false` | Log each payload to the browser console before sending. |

> **`scrubUrl` note.** Unlike the other options, `scrubUrl` is a **function**, so it
> is supported **only via the integration**, not the `<Takt />` component. The
> integration serializes config into a build-time runtime string, so `scrubUrl` is
> stringified with `.toString()` and re-evaluated in the browser. It MUST be a
> **self-contained** function — no closure variables or outer-scope references — and
> must be **developer-controlled**: never build it from user input.
>
> The `<Takt />` component serializes its config as a JSON data island, which cannot
> carry a function — so passing `scrubUrl` to `<Takt />` **throws at build time**
> rather than silently doing nothing. Use the integration if you need it.

## View Transitions

Astro's client router runs several history operations per navigation (scroll-restoration `replaceState` plus `pushState`), so Takt does **not** rely on core's history patch here — it would over-count. Instead the runtime fires one explicit initial pageview and then one per Astro `astro:after-swap` event (including View Transitions DOM swaps and back/forward), so each navigation is counted exactly once. On a plain MPA (no client router) the script re-runs per page load, which fires the initial pageview each time. The runtime is SSR/prerender safe — it only runs in the browser.

## Route redaction

Query strings are stripped by default, but path segments are sent as they are, so `/verify/abc123` leaks the token. List the sensitive routes in `redactRoutes` and every matching path is sent as its pattern, while the other pages keep their real path:

```js
takt({ redactRoutes: ['/verify/[token]', '/invoices/[id].pdf'] })
```

The rule covers the page URL, same-origin referrers, outbound and download link destinations, and 404 paths. Patterns use Astro's syntax (`[param]`, `[...rest]`) and also accept `:param` and `*`.

To send every page as its route template instead (`/blog/hello` becomes `/blog/[slug]`), turn on `routeTemplates`. Astro knows the template on the server (`Astro.routePattern`), so it travels in a `<meta name="takt:route">` tag that the runtime reads at each pageview, including after a ClientRouter navigation. With the integration, render that tag with `<TaktRoute />` in the `<head>` of your layout:

```js
// astro.config.mjs
export default defineConfig({
  integrations: [takt({ routeTemplates: true })],
})
```

```astro
---
import TaktRoute from '@vskstudio/takt-astro/TaktRoute.astro'
---
<head>
  <TaktRoute />
</head>
```

The `<Takt />` component renders the tag itself when `routeTemplates` is set:

```astro
<Takt domain="example.com" routeTemplates />
```

`Astro.routePattern` exists from Astro 5. On Astro 4 no tag is rendered, so `redactRoutes` still applies and the real path is sent otherwise. This mode merges every article of a public blog into one row, so it suits private areas better; `redactRoutes` is usually the right tool for a public site.

## Custom events

`track`, `pageview`, `optOut`, `optIn` and `isOptedOut` are re-exported from core for convenience. `track` and `pageview` act on core's default instance, which only exists in the browser once the injected runtime has booted, so call them from a client-side `<script>`, not from `.astro` frontmatter (where they are silent no-ops):

```astro
<button id="signup">Sign up</button>
<script>
  import { track } from '@vskstudio/takt-astro'
  document.getElementById('signup')?.addEventListener('click', () => {
    track('Signup', { props: { plan: 'pro' }, revenue: { amount: '9.00', currency: 'USD' } })
  })
</script>
```

## Consent

`optOut`, `optIn` and `isOptedOut` do not wait for the runtime to boot: they read and write the stored choice directly. A consent banner can therefore run before the injected runtime, and the instance it boots later honours the choice. Call them from a client-side `<script>`, since the choice lives in the browser.

```astro
<button id="analytics-toggle"></button>
<script>
  import { isOptedOut, optIn, optOut } from '@vskstudio/takt-astro'
  const button = document.getElementById('analytics-toggle')
  const render = () => {
    if (button) button.textContent = isOptedOut() ? 'Enable analytics' : 'Disable analytics'
  }
  button?.addEventListener('click', () => {
    isOptedOut() ? optIn() : optOut()
    render()
  })
  render()
</script>
```

## Widgets

Thin wrappers around Takt's server-rendered badge SVG and embed iframe.

```astro
---
import Badge from '@vskstudio/takt-astro/Badge.astro'
import Embed from '@vskstudio/takt-astro/Embed.astro'
---
<Badge domain="example.com" variant="d" />
<Embed domain="example.com" theme="dark" />
```

`Badge` renders an `<img>` (props: `domain` — required —, `variant` `a` | `b` | `d`, `glyph` `unplug` | `dash` | `off` | `eyeoff`, `lang` `fr` | `en`, `host`). Its `alt` defaults to `"takt"` and can be overridden; `loading="lazy"` and `decoding="async"` are applied after your attributes and cannot.

`Embed` renders an `<iframe>` (props: `domain` — required —, `theme` `light` | `dark` | `auto`, `lang`, `host`, plus `width` = `404`, `height` = `264`, `title` = `"takt"`); the iframe is sandboxed (`allow-scripts allow-same-origin`) and ships a fixed `referrerpolicy="strict-origin-when-cross-origin"`, a `loading="lazy"` and a zero border — all applied after your attributes, so a consumer cannot weaken them. Extra attributes pass through to the underlying element, but the built `src` is locked and cannot be overridden. The optional `host` must be an absolute `http(s)` URL — core validates it and throws on anything else (e.g. a `javascript:` URL), and reduces it to its origin (dropping path/query). Omitting `host` falls back to the hosted Takt origin (`https://taktlytics.com`), not to the current origin.

## Public stats

`createStats` (re-exported from core) reads public analytics:

Every method takes the domain first and the params second — the domain is optional once `createStats` is bound to one:

```js
import { createStats, PublicApiError } from '@vskstudio/takt-astro'

const stats = createStats({ domain: 'example.com' })

try {
  const summary = await stats.summary(undefined, { period: '7d' })
  const rows = await stats.breakdown('page', undefined, { period: '7d' })
  const live = await stats.realtime()
} catch (err) {
  if (err instanceof PublicApiError) console.error(err.status, err.message)
}
```

## Public exports

From `@vskstudio/takt-astro`:

- `default` / `takt` — the integration factory (same function under both names)
- `resolveOptions`, `assertNoScrubUrl`, `buildRuntime` — the internals the `.astro` components build on, exported so you can drive the runtime yourself
- Re-exported from core: `track`, `pageview`, `optOut`, `optIn`, `isOptedOut`, `createStats`, `PublicApiError`, `badgeUrl`, `embedUrl`
- Types: `TaktOptions`, plus `InitOptions`, `TrackOptions`, `BadgeOptions`, `EmbedOptions`, `BadgeVariant`, `BadgeGlyph`, `EmbedTheme`, `WidgetLang`, `StatsClient`, `StatsClientOptions`, `StatsParams`, `StatsPeriod`, `StatsDimension`, `StatsMetrics`, `StatsSummary`, `StatsPoint`, `StatsTimeseries`, `StatsBreakdownRow`, `StatsBreakdown`, `StatsRealtime` re-exported from core

Component subpaths: `@vskstudio/takt-astro/Takt.astro`, `/TaktRoute.astro`, `/Badge.astro`, `/Embed.astro`.

## License

MIT
