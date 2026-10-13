import { r } from './OnboardingUI'

type Pt = { x: number; y: number }
export type MapMarker = Pt & { id: string; label?: string; selected?: boolean }

const ctrl = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2 + (b.y - a.y) * 0.18, y: (a.y + b.y) / 2 - (b.x - a.x) * 0.18 })
export const pointOnRoute = (a: Pt, b: Pt, t: number): Pt => {
  const c = ctrl(a, b), u = 1 - t
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
}

// Illustrative sample map. It does not geocode or route; markers are placed from sample data.
export default function MiniMap({
  label, pickup, destination, rider, markers, height = 240, children,
}: {
  label: string; pickup?: Pt | null; destination?: Pt | null
  rider?: (Pt & { state: 'fresh' | 'stale' }) | null
  markers?: MapMarker[]; height?: number | string; children?: React.ReactNode
}) {
  const route = pickup && destination
  return (
    <div className="relative overflow-hidden flex-shrink-0" style={{ height: typeof height === 'number' ? r(height) : height, background: '#E4E1D7' }}>
      <svg viewBox="0 0 390 300" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
        <rect width="390" height="300" fill="#E4E1D7" />
        {[0, 1, 2, 3].map(i => <rect key={i} x="0" y={i * 80} width="390" height="72" fill={i % 2 ? '#DEDBD1' : '#DAD7CD'} />)}
        <rect x="18" y="200" width="80" height="60" rx="8" fill="#B8D4A2" />
        <path d="M 304 150 Q 350 130 370 175 Q 388 220 350 245 Q 310 260 290 220 Q 280 175 304 150" fill="#9DC4E0" />
        {[72, 152, 232].map(y => <rect key={y} x="0" y={y} width="390" height="7" fill="#F2EFE7" />)}
        {[70, 150, 230, 310].map(x => <rect key={x} x={x} y="0" width="7" height="300" fill="#F2EFE7" />)}
        <path d="M -10 270 L 260 -10" stroke="#F5F2EA" strokeWidth="9" fill="none" />
        {route && (() => { const c = ctrl(pickup!, destination!); return <path d={`M ${pickup!.x} ${pickup!.y} Q ${c.x} ${c.y} ${destination!.x} ${destination!.y}`} stroke="#3B5BDB" strokeWidth="4" strokeDasharray="9 6" fill="none" /> })()}
        {markers?.map(m => (
          <g key={m.id} transform={`translate(${m.x},${m.y})`}>
            <circle r={m.selected ? 13 : 9} fill={m.selected ? '#12B76A' : '#fff'} stroke={m.selected ? '#fff' : '#3B5BDB'} strokeWidth="3" />
            {m.selected && <circle r="4.5" fill="#fff" />}
          </g>
        ))}
        {pickup && !markers && (
          <g transform={`translate(${pickup.x},${pickup.y})`}><circle r="12" fill="#12B76A" stroke="#fff" strokeWidth="3" /><circle r="4.5" fill="#fff" /></g>
        )}
        {destination && (
          <g transform={`translate(${destination.x},${destination.y})`}>
            <path d="M0-24 Q15-24 15-11 Q15 3 0 16 Q-15 3 -15-11 Q-15-24 0-24Z" fill="#3B5BDB" stroke="#fff" strokeWidth="2" /><circle cy="-10" r="5" fill="#fff" />
          </g>
        )}
        {rider && (
          <g transform={`translate(${rider.x},${rider.y})`}>
            {rider.state === 'stale'
              ? <><circle r="20" fill="none" stroke="#667085" strokeWidth="2" strokeDasharray="4 4" /><circle r="13" fill="#98A2B3" stroke="#fff" strokeWidth="3" /></>
              : <><circle r="20" fill="#3B5BDB" opacity="0.18" /><circle r="13" fill="#3B5BDB" stroke="#fff" strokeWidth="3" /></>}
            <circle r="4" fill="#fff" />
          </g>
        )}
      </svg>
      <span className="absolute" style={{ left: r(8), bottom: r(8), padding: `${r(2)} ${r(8)}`, borderRadius: 999, background: 'rgba(255,255,255,0.92)', color: '#475467', fontSize: r(12), fontWeight: 600 }}>
        Prototype map · sample locations
      </span>
      {children}
    </div>
  )
}
