export type MapMode =
  | 'idle'          // user dot pulsing, recenter button
  | 'searching'     // moderate dim overlay
  | 'route'         // pickup pin + drop pin + dashed route line
  | 'radar'         // user dot + radar rings (waiting)
  | 'bike-near'     // route + bike marker approaching pickup
  | 'in-progress'   // user dot on route + drop pin + short route segment
  | 'route-detour'  // full route + orange detour branch + customer pins
  | 'dark'          // heavy dim (OTP / summary overlays)
  | 'static'        // no markers, no overlays (setup screens)

const UX = 195, UY = 355  // rider / user dot position
const DX = 278, DY = 178  // drop-off / destination position

function UserDot() {
  return (
    <g>
      <circle cx={UX} cy={UY} r="22" fill="#3B5BDB"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'dotBreathe 2.4s ease-in-out infinite' }} />
      <circle cx={UX} cy={UY} r="11" fill="#3B5BDB" opacity="0.35" />
      <circle cx={UX} cy={UY} r="6.5" fill="white" />
      <circle cx={UX} cy={UY} r="4.5" fill="#3B5BDB" />
    </g>
  )
}

function PickupPin() {
  return (
    <g transform={`translate(${UX},${UY})`}>
      <circle r="10" fill="#12B76A" />
      <circle r="5" fill="white" />
    </g>
  )
}

function DropPin({ x = DX, y = DY, color = '#3B5BDB' }: { x?: number; y?: number; color?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M0-18 Q11-18 11-8 Q11 2 0 12 Q-11 2 -11-8 Q-11-18 0-18Z" fill={color} />
      <circle r="4.5" fill="white" />
    </g>
  )
}

function RouteLine() {
  return (
    <path
      d={`M ${UX} ${UY} Q 222 295 248 240 Q 262 210 ${DX} ${DY}`}
      stroke="#3B5BDB" strokeWidth="3.5" strokeDasharray="9 5" fill="none" opacity="0.85"
    />
  )
}

function DetourBranch() {
  // Short orange branch from main route to customer pickup slightly off-route
  const cpx = 238, cpy = 330  // customer pickup (off-route)
  return (
    <g>
      {/* Detour branch line */}
      <path d="M 224 314 L 238 330" stroke="#F79009" strokeWidth="3" strokeDasharray="6 4" fill="none" opacity="0.9" />
      {/* Customer pickup pin (orange) */}
      <circle cx={cpx} cy={cpy} r="9" fill="#F79009" />
      <circle cx={cpx} cy={cpy} r="4.5" fill="white" />
      {/* "Detour" label */}
      <rect x="246" y="320" width="58" height="18" rx="5" fill="#FFF8ED" stroke="#FEDF89" strokeWidth="1" />
      <text x="275" y="333" textAnchor="middle" fontSize="10" fontWeight="700" fill="#B54708" fontFamily="Inter, sans-serif">+0.6 km</text>
    </g>
  )
}

function BikeMarker() {
  return (
    <g transform="translate(222, 316)">
      <circle r="15" fill="#3B5BDB" stroke="white" strokeWidth="2.5" />
      <g stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-4 2 L0-6 L4 2Z" fill="white" stroke="none" />
        <circle cx="-5" cy="4" r="3.5" />
        <circle cx="5" cy="4" r="3.5" />
        <line x1="-5" y1="0.5" x2="0" y2="-3" />
        <line x1="0" y1="-3" x2="5" y2="0.5" />
      </g>
    </g>
  )
}

function RadarRings() {
  return (
    <g>
      {[0, 0.65, 1.3].map((delay, i) => (
        <circle key={i} cx={UX} cy={UY} r="28" fill="none" stroke="#3B5BDB" strokeWidth="1.5"
          style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `radarPulse 2s ease-out ${delay}s infinite` }} />
      ))}
    </g>
  )
}

function RecenterButton() {
  return (
    <g transform="translate(354, 290)">
      <rect x="-17" y="-17" width="34" height="34" rx="10" fill="white" opacity="0.95" />
      <g stroke="#667085" strokeWidth="1.8" fill="none" strokeLinecap="round">
        <circle cx="0" cy="0" r="5.5" />
        <line x1="0" y1="-10" x2="0" y2="-7.5" />
        <line x1="0" y1="7.5" x2="0" y2="10" />
        <line x1="-10" y1="0" x2="-7.5" y2="0" />
        <line x1="7.5" y1="0" x2="10" y2="0" />
      </g>
    </g>
  )
}

export default function Map({ mode }: { mode: MapMode }) {
  const showUserDot   = mode === 'idle' || mode === 'radar' || mode === 'in-progress'
  const showRoute     = mode === 'route' || mode === 'bike-near' || mode === 'in-progress' || mode === 'route-detour'
  const showPickup    = mode === 'route' || mode === 'bike-near' || mode === 'route-detour'
  const showDrop      = showRoute
  const showBike      = mode === 'bike-near'
  const showRadar     = mode === 'radar'
  const showDetour    = mode === 'route-detour'
  const lightDim      = mode === 'searching'
  const heavyDim      = mode === 'dark'

  return (
    <svg viewBox="0 0 390 844" className="absolute inset-0 w-full h-full"
      xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">

      <rect width="390" height="844" fill="#E4E1D7" />
      <rect x="0" y="0"   width="390" height="84"  fill="#DAD7CD" />
      <rect x="0" y="92"  width="390" height="82"  fill="#DEDBD1" />
      <rect x="0" y="182" width="390" height="82"  fill="#DAD7CD" />
      <rect x="0" y="272" width="390" height="82"  fill="#DEDBD1" />
      <rect x="0" y="362" width="390" height="82"  fill="#DAD7CD" />
      <rect x="0" y="452" width="390" height="82"  fill="#DEDBD1" />
      <rect x="0" y="542" width="390" height="82"  fill="#DAD7CD" />
      <rect x="0" y="632" width="390" height="82"  fill="#DEDBD1" />
      <rect x="0" y="722" width="390" height="122" fill="#DAD7CD" />
      <rect x="0"   y="0" width="59"  height="844" fill="rgba(0,0,0,0.025)" />
      <rect x="67"  y="0" width="57"  height="844" fill="rgba(255,255,255,0.03)" />
      <rect x="132" y="0" width="57"  height="844" fill="rgba(0,0,0,0.02)" />
      <rect x="197" y="0" width="57"  height="844" fill="rgba(255,255,255,0.025)" />
      <rect x="262" y="0" width="57"  height="844" fill="rgba(0,0,0,0.02)" />
      <rect x="327" y="0" width="63"  height="844" fill="rgba(255,255,255,0.02)" />

      {/* Parks */}
      <rect x="18" y="210" width="86" height="56" rx="8" fill="#B8D4A2" />
      <ellipse cx="42" cy="228" rx="14" ry="12" fill="#A5C490" />
      <ellipse cx="72" cy="232" rx="18" ry="14" fill="#A5C490" opacity="0.8" />
      <ellipse cx="55" cy="248" rx="22" ry="10" fill="#ADC898" opacity="0.7" />
      <rect x="248" y="468" width="82" height="62" rx="8" fill="#B8D4A2" />
      <ellipse cx="270" cy="484" rx="12" ry="10" fill="#A5C490" />
      <ellipse cx="300" cy="490" rx="16" ry="12" fill="#A5C490" opacity="0.8" />
      <ellipse cx="285" cy="516" rx="20" ry="9"  fill="#ADC898" opacity="0.7" />

      {/* Lake */}
      <path d="M 304 296 Q 350 272 370 320 Q 390 368 366 402 Q 340 432 304 418 Q 268 404 270 360 Q 272 316 304 296" fill="#9DC4E0" />
      <path d="M 304 296 Q 350 272 370 320 Q 390 368 366 402 Q 340 432 304 418 Q 268 404 270 360 Q 272 316 304 296" fill="none" stroke="#86B3CF" strokeWidth="1.5" />
      <path d="M 295 330 Q 320 325 340 335" stroke="white" strokeWidth="1" opacity="0.4" fill="none" />
      <path d="M 285 355 Q 315 348 345 358" stroke="white" strokeWidth="1" opacity="0.3" fill="none" />

      {/* Roads */}
      {[85,175,265,355,445,535,625,715].map(y => (
        <rect key={y} x="0" y={y} width="390" height="6" fill="#F2EFE7" />
      ))}
      {[176,446,626].map(y => (
        <rect key={y} x="0" y={y} width="390" height="10" fill="#F5F2EA" />
      ))}
      {[60,130,194,260,326].map(x => (
        <rect key={x} x={x} y="0" width="6" height="844" fill="#F2EFE7" />
      ))}
      {[130,260].map(x => (
        <rect key={x} x={x} y="0" width="10" height="844" fill="#F5F2EA" />
      ))}
      <path d="M -10 540 L 272 -10" stroke="#F5F2EA" strokeWidth="10" fill="none" />
      <path d="M -10 540 L 272 -10" stroke="#F2EFE7" strokeWidth="6"  fill="none" />
      {[176,446,626].map(y =>
        Array.from({ length: 13 }).map((_, i) => (
          <rect key={`${y}-${i}`} x={i * 32 + 4} y={y + 4} width="16" height="2" rx="1" fill="#EBE8E0" opacity="0.6" />
        ))
      )}

      {/* Dynamic elements */}
      {showRoute && <RouteLine />}
      {showDetour && <DetourBranch />}
      {showDrop && <DropPin />}
      {showPickup && <PickupPin />}
      {showUserDot && <UserDot />}
      {showRadar && <RadarRings />}
      {showBike && <BikeMarker />}
      {mode === 'idle' && <RecenterButton />}

      {lightDim && <rect width="390" height="844" fill="rgba(10,14,30,0.38)" />}
      {heavyDim && <rect width="390" height="844" fill="rgba(10,14,30,0.55)" />}
    </svg>
  )
}
