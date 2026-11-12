/**
 * Legacy raw-identifier delivery (no dependencies so it can be tested offline). While enabled (default) embed responses keep returning the
 * raw xpub next to the token. After KEYREX_LEGACY_XPUB_DELIVERY=false, the `xpub` field in
 * embedded-site responses carries the per-site pairwise identifier instead, so a value learned
 * on one site is useless on another. Delivery is forced off once the sunset date passes
 * (KEYREX_LEGACY_SUNSET, default 2027-11-30), regardless of the toggle. The raw value remains
 * inside the token (legacy_sub) only while KEYREX_INCLUDE_LEGACY_SUB is not "false".
 */
const DEFAULT_LEGACY_SUNSET = '2027-11-30'

/** Date after which legacy delivery is forced off. KEYREX_LEGACY_SUNSET overrides the default. */
export function getLegacySunset(): Date {
  const configured = process.env.KEYREX_LEGACY_SUNSET
  const date = new Date(configured || DEFAULT_LEGACY_SUNSET)
  return isNaN(date.getTime()) ? new Date(DEFAULT_LEGACY_SUNSET) : date
}

export function isLegacyDeliveryEnabled(now: number = Date.now()): boolean {
  if (process.env.KEYREX_LEGACY_XPUB_DELIVERY === 'false') return false
  return now < getLegacySunset().getTime()
}
