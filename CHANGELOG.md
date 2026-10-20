# @vskstudio/takt-astro

## 0.10.2

### Patch Changes

- b27a5e5: Ships `@vskstudio/takt-core` 0.12.3, which stops the `takt.auto.js` bundle from overwriting `window.takt`. The Astro integration does not load that bundle, so its runtime is unchanged. The `@vskstudio/takt-core` peer range is raised to `>=0.12.3`.

## 0.10.1

### Patch Changes

- 8247b26: Embarque takt-core 0.12.2 : liste unique de 21 extensions de téléchargement.

## 0.10.0

### Minor Changes

- 69c5367: Takt core 0.12 options. The integration and the `<Takt />` component now accept `redactUndecodablePaths` (send a path that cannot be decoded leniently instead of masking it) and `fileExtensions` (narrow the download extensions when `files` is on). `normalizeHost` is re-exported from core. The peer dependency moves to `@vskstudio/takt-core` `>=0.12.1`, which brings route redaction with brace constraints and the case-insensitive `exclude` matching of core 0.11 and 0.12. In route template mode (`routeTemplates`), a page whose route cannot be resolved now fails closed in core 0.12.1: it is sent with its `redactRoutes` pattern when one covers it, and otherwise as `/[redacted]`, never as the real path.

## 0.9.1

### Patch Changes

- Published to npm through Trusted Publishing (OIDC) instead of a long-lived token. No runtime change.

## 0.9.0

### Minor Changes

- Requires `@vskstudio/takt-core` 0.11.0 or later: route redaction applies to outbound-link and file-download destinations and to the `404` path, `exclude` matches case-insensitively on the percent-decoded path, and the server client refuses a plain `http://` endpoint outside localhost.

## 0.8.0

### Minor Changes

- 8c11216: New `redactRoutes` and `routeTemplates` options on the integration and the `<Takt />` component. `redactRoutes` sends sensitive paths such as `/verify/abc123` as their pattern (`/verify/[token]`). `routeTemplates` sends every page as its Astro route template, read from `Astro.routePattern` through a `<meta name="takt:route">` tag that `<Takt />` renders itself and that the new `TaktRoute.astro` component renders for the integration path; the tag is read again after each ClientRouter navigation. Requires `@vskstudio/takt-core` 0.10.0.

## 0.7.0

### Minor Changes

- af8f3b4: New `debug` option on the integration and the `<Takt />` component. The package re-exports the new `isOptedOut` from core next to `optOut` and `optIn`, and all three work before the injected runtime boots. Requires `@vskstudio/takt-core` 0.9.0, where `scrubUrl` also covers outbound-link and file-download URLs.

## 0.6.2

### Patch Changes

- Realign the README with the package code: the autocapture selector is `[data-takt-event]`, the default ingest endpoint is the hosted Takt collect URL, and the documented component props match what `Takt.astro` actually accepts. No runtime change.

## 0.5.1

### Patch Changes

- Require takt-core >=0.6.0, whose default ingest endpoint and stats/widget host are now the hosted Takt origin (https://taktlytics.com). Docs updated to match; no wrapper code change.

## 0.5.0

### Minor Changes

- dfe06bd: Expose advanced tracker options: enabled, sampleRate, trackQuery, queryParams,
  scrubUrl (function, build-time stringified / config only) and tagged. Peer dep raised to takt-core >=0.5.0.

## 0.3.1

### Patch Changes

- Lock the widget `src` so consumer attributes can't override the built URL, and add `referrerpolicy="strict-origin-when-cross-origin"` to the embed iframe.

## 0.3.0

### Minor Changes

- Add native `TaktBadge` and `TaktEmbed` widget components and re-export the public stats client (`createStats`) and widget URL builders from `@vskstudio/takt-core`. Requires `@vskstudio/takt-core` >= 0.3.0.

## 0.2.1

### Patch Changes

- Fix the `<Takt />` component never running in production builds. It shipped an `is:inline` module whose bare `@vskstudio/takt-core` import the browser couldn't resolve, and it imported its helpers from `src/` (absent from the published tarball). The component now passes options through a JSON data island and boots from a bundled module that resolves the core import. Same single-pageview-per-navigation behaviour as the integration.
- 3676d9e: Fix client-side navigations emitting several pageviews each. Astro's ClientRouter runs multiple history operations per navigation, so relying on core's history patch over-counted. The runtime now drives pageviews from `astro:after-swap` (one per navigation) plus a single explicit initial pageview.

## 0.2.0

Initial release.

- Default-export `takt(options)` Astro integration that injects the Takt runtime via `astro:config:setup`.
- `<Takt />` component for manual placement in a layout `<head>`.
- View Transitions support: re-fires a pageview on `astro:page-load`, skipping the initial load to avoid double-counting.
- SSR/prerender safe; runs only in the browser.
- Re-exports core `track` / `pageview` / `optOut` / `optIn`.
