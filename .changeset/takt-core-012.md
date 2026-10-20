---
"@vskstudio/takt-astro": minor
---

Takt core 0.12 options. The integration and the `<Takt />` component now accept `redactUndecodablePaths` (send a path that cannot be decoded leniently instead of masking it) and `fileExtensions` (narrow the download extensions when `files` is on). `normalizeHost` is re-exported from core. The peer dependency moves to `@vskstudio/takt-core` `>=0.12.1`, which brings route redaction with brace constraints and the case-insensitive `exclude` matching of core 0.11 and 0.12. In route template mode (`routeTemplates`), a page whose route cannot be resolved now fails closed in core 0.12.1: it is sent with its `redactRoutes` pattern when one covers it, and otherwise as `/[redacted]`, never as the real path.
