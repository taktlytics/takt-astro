export { default, default as takt } from './integration'
export { resolveOptions, assertNoScrubUrl, type TaktOptions } from './options'
export { buildRuntime } from './runtime'
export { track, pageview, optOut, optIn, isOptedOut } from '@vskstudio/takt-core'
export type { InitOptions, TrackOptions } from '@vskstudio/takt-core'
export { createStats, PublicApiError, badgeUrl, embedUrl } from '@vskstudio/takt-core'
export type {
  BadgeOptions,
  EmbedOptions,
  BadgeVariant,
  BadgeGlyph,
  EmbedTheme,
  WidgetLang,
  StatsClient,
  StatsClientOptions,
  StatsParams,
  StatsPeriod,
  StatsDimension,
  StatsMetrics,
  StatsSummary,
  StatsPoint,
  StatsTimeseries,
  StatsBreakdownRow,
  StatsBreakdown,
  StatsRealtime,
} from '@vskstudio/takt-core'
