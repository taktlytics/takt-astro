---
'@vskstudio/takt-astro': minor
---

New `debug` option on the integration and the `<Takt />` component. The package re-exports the new `isOptedOut` from core next to `optOut` and `optIn`, and all three work before the injected runtime boots. Requires `@vskstudio/takt-core` 0.9.0, where `scrubUrl` also covers outbound-link and file-download URLs.
