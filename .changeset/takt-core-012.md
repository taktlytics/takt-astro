---
"@vskstudio/takt-astro": minor
---

Takt core 0.12 options. The integration and the `<Takt />` component now accept `redactUndecodablePaths` (send a path that cannot be decoded leniently instead of masking it) and `fileExtensions` (narrow the download extensions when `files` is on). `normalizeHost` is re-exported from core. The peer dependency moves to `@vskstudio/takt-core` `>=0.12.0`, which brings route redaction with brace constraints and the case-insensitive `exclude` matching of core 0.11 and 0.12.
