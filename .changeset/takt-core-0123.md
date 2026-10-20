---
"@vskstudio/takt-astro": patch
---

Ships `@vskstudio/takt-core` 0.12.3, which stops the `takt.auto.js` bundle from overwriting `window.takt`. The Astro integration does not load that bundle, so its runtime is unchanged. The `@vskstudio/takt-core` peer range is raised to `>=0.12.3`.
