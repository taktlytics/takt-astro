---
'@vskstudio/takt-astro': minor
---

New `redactRoutes` and `routeTemplates` options on the integration and the `<Takt />` component. `redactRoutes` sends sensitive paths such as `/verify/abc123` as their pattern (`/verify/[token]`). `routeTemplates` sends every page as its Astro route template, read from `Astro.routePattern` through a `<meta name="takt:route">` tag that `<Takt />` renders itself and that the new `TaktRoute.astro` component renders for the integration path; the tag is read again after each ClientRouter navigation. Requires `@vskstudio/takt-core` 0.10.0.
