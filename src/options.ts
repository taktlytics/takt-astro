import type { InitOptions } from '@vskstudio/takt-core'

/**
 * Options for the Takt integration and `<Takt />` component. Mirrors core's
 * {@link InitOptions} naming; `spa` maps to core's `auto`.
 */
export interface TaktOptions {
  /** Site identifier sent with every event. Defaults to `location.hostname`. */
  domain?: string
  /** Ingestion endpoint. Defaults to `https://taktlytics.com/api/event` (the hosted Takt origin); pass `/api/event` for a same-origin first-party proxy. */
  endpoint?: string
  /**
   * First-party origin to derive the endpoint from (`{origin}/api/event`) — a
   * custom domain you proxy through to dodge ad-blockers. `endpoint` wins over it.
   */
  scriptOrigin?: string
  /** Auto-track outbound link clicks. */
  outbound?: boolean
  /** Auto-track file downloads. */
  files?: boolean
  /**
   * Report a `404` event when the page is an error page (`[data-takt-404]` /
   * `<meta name="takt:404">` marker, or a 404 HTTP status).
   */
  track404?: boolean
  /** Track client-side navigations (history + Astro View Transitions). Default `true`. */
  spa?: boolean
  /** Suppress events when the browser's Do Not Track is enabled. Default `true`. */
  respectDnt?: boolean
  /** Suppress events on localhost and private IP ranges. Default `true`. */
  excludeLocalhost?: boolean
  /** Master kill switch — when `false`, every event is suppressed. */
  enabled?: boolean
  /** Fraction of visitors to track, `0`–`1`. Defaults to tracking everyone. */
  sampleRate?: number
  /** Send the full query string with pageviews instead of stripping it. */
  trackQuery?: boolean
  /** Whitelist of query params to keep when `trackQuery` is off. */
  queryParams?: string[]
  /** Path prefixes never tracked, e.g. `['/app','/account']`. Segment-bounded: `'/app'` matches `'/app'` and `'/app/…'` but not `'/application'`. */
  exclude?: string[]
  redactRoutes?: string[]
  routeTemplates?: boolean
  /**
   * Rewrite each URL before it is sent (e.g. strip a fragment or PII).
   * MUST be a self-contained function: it is stringified at build time and
   * re-evaluated in the browser, so it cannot reference closure/outer-scope
   * variables. Never build it from user input.
   *
   * Integration-only: a function cannot survive the `<Takt />` component's
   * JSON data island, so it is supported solely via the `takt()` integration in
   * `astro.config`. Passing it to `<Takt />` throws — see {@link assertNoScrubUrl}.
   */
  scrubUrl?: (url: string) => string
  /** Auto-track elements marked with `data-takt-event`. */
  tagged?: boolean
  debug?: boolean
}

/**
 * Guard the `<Takt />` component path against `scrubUrl`. The component
 * serializes its config as a JSON data island (`JSON.stringify` → `JSON.parse`),
 * which silently drops functions — so accepting `scrubUrl` there would be a
 * silent no-op. Fail fast at build time and point to the integration, which
 * embeds `scrubUrl` as build-time JS instead.
 */
export function assertNoScrubUrl(options: TaktOptions = {}): void {
  if (options.scrubUrl !== undefined) {
    throw new Error(
      "Takt: scrubUrl is a function and cannot be serialized into the <Takt /> component's config. " +
        'Use the Takt integration in astro.config instead (it embeds scrubUrl as build-time JS).',
    )
  }
}

/**
 * Map user options to core's {@link InitOptions} for JSON serialization.
 * `scrubUrl` is intentionally absent here — it is a function and cannot survive
 * `JSON.stringify`, so it is threaded separately to {@link buildRuntime}.
 */
export function resolveOptions(options: TaktOptions = {}): InitOptions {
  return {
    domain: options.domain,
    endpoint: options.endpoint,
    scriptOrigin: options.scriptOrigin,
    outbound: options.outbound ?? false,
    files: options.files ?? false,
    notFound: options.track404 ?? false,
    respectDnt: options.respectDnt ?? true,
    excludeLocalhost: options.excludeLocalhost ?? true,
    auto: options.spa ?? true,
    enabled: options.enabled,
    sampleRate: options.sampleRate,
    trackQuery: options.trackQuery,
    queryParams: options.queryParams,
    exclude: options.exclude,
    redactRoutes: options.redactRoutes,
    routeTemplates: options.routeTemplates,
    tagged: options.tagged,
    debug: options.debug,
  }
}
