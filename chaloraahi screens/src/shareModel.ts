// Leaf module: the single trip-share model used by Buddy, Pilot and SOS.
export const SHARE_LINK = 'https://chaloraahi.example/trip/k7Q2-sample'
// Prototype configuration. A production backend must enforce this expiry and revocation server-side.
export const SHARE_TTL_MS = 2 * 3600e3
export const FRESH_MS = 30000

export type ShareLink = {
  on: boolean; expires: number; copied: boolean; opened: boolean
  createdAt: number; revoked: boolean; revokedAt: number
  revoke: 'none' | 'uncertain' | 'failed'
  srvRevoked: boolean
}
export const noShare = (): ShareLink => ({ on: false, expires: 0, copied: false, opened: false, createdAt: 0, revoked: false, revokedAt: 0, revoke: 'none', srvRevoked: false })
export const createShare = (now = Date.now()): ShareLink => ({ ...noShare(), on: true, createdAt: now, expires: now + SHARE_TTL_MS })

export type LinkState = 'none' | 'active' | 'expired' | 'revoked' | 'uncertain' | 'closed'
// Access ends with the ride or at expiry, whichever is first. A revoked link stays revoked.
export const linkState = (s: ShareLink, now: number, rideClosed = false): LinkState =>
  s.revoked ? 'revoked' : !s.on ? 'none' : rideClosed ? 'closed' : now >= s.expires ? 'expired' : s.revoke === 'uncertain' ? 'uncertain' : 'active'

export type Fresh = 'live' | 'stale' | 'unavailable'
export const freshness = (loc: 'fresh' | 'stale' | 'unavailable', at: number, now: number): Fresh =>
  loc === 'unavailable' ? 'unavailable' : loc === 'fresh' && now - at <= FRESH_MS ? 'live' : 'stale'
