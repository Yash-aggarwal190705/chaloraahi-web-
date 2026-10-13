import type { PlanId } from './walletModel'

// Proposed concept catalog. Not approved entitlements. One source for cards, comparison, summary and checkout.
export type Plan = { id: PlanId; name: string; price: number; blurb: string; limits: Record<FeatureKey, number | boolean> }
export type FeatureKey = 'templates' | 'weekly' | 'monthly' | 'calendar' | 'summary'

export const FEATURES: { key: FeatureKey; label: string; benefit: (v: number | boolean) => string | null; value: (v: number | boolean) => string }[] = [
  { key: 'templates', label: 'Saved commute templates', benefit: v => `Up to ${v} saved commute templates`, value: v => String(v) },
  { key: 'weekly', label: 'Weekly commute overview', benefit: v => (v ? 'Weekly personal commute overview' : null), value: v => (v ? 'Included' : 'Not included') },
  { key: 'monthly', label: 'Monthly commute overview', benefit: v => (v ? 'Monthly personal commute overview' : null), value: v => (v ? 'Included' : 'Not included') },
  { key: 'calendar', label: 'Calendar-file export for scheduled rides', benefit: v => (v ? 'Calendar-file export for scheduled rides' : null), value: v => (v ? 'Included' : 'Not included') },
  { key: 'summary', label: 'Downloadable monthly commute summary', benefit: v => (v ? 'Downloadable personal monthly commute summary' : null), value: v => (v ? 'Included' : 'Not included') },
]

export const PLANS: Plan[] = [
  { id: 'basic', name: 'Basic', price: 9900, blurb: 'For a simple, organised commute routine.', limits: { templates: 3, weekly: true, monthly: false, calendar: false, summary: false } },
  { id: 'plus', name: 'Plus', price: 19900, blurb: 'For regular commuters who want more planning tools.', limits: { templates: 10, weekly: true, monthly: true, calendar: true, summary: false } },
  { id: 'pro', name: 'Pro', price: 29900, blurb: 'For commuters who want detailed personal records.', limits: { templates: 25, weekly: true, monthly: true, calendar: true, summary: true } },
]
export const planById = (id: PlanId) => PLANS.find(p => p.id === id)!
export const benefitsOf = (p: Plan) => FEATURES.map(f => f.benefit(p.limits[f.key])).filter((x): x is string => !!x)

export const BILLING_LINE = 'Billed once for one month · manual renewal in this demo.'
export const CORE_FREE = ['SOS and emergency contacts', 'Report and block', 'Identity verification', 'Required privacy protections', 'Basic eligible ride booking', 'Essential ride-status information']
