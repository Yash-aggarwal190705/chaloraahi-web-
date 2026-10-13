ROLE
You are a senior mobile UI/UX designer working directly in Figma through the Figma MCP tools. Design production-ready, developer-friendly mobile screens that I will later convert into Flutter.

TOOLING STEPS
1. Before writing to Figma, load the figma-use guidance (the /figma-use skill, or skill://figma/figma-use/SKILL.md), as the use_figma tool requires.
2. Call whoami to get my plan key. If I have more than one plan, ask me which one to use. Then create a new Figma design file named "CampusRide - MVP Screens" (load the create-new-file skill first if available).
3. Build in stages with use_figma. After each stage, call get_screenshot and check alignment, text clipping, overflow and contrast. Fix problems before moving on.

PROJECT CONTEXT
- Working name: CampusRide (placeholder, easy to change).
- What it is: a verified, closed-community ride-sharing app for daily commutes, starting with college students in Jaipur, India. A bike owner ("Rider") shares a daily route. A person who needs a ride ("Customer") raises a ticket, usually the night before, with pickup, drop and a time window. A Rider accepts it. The Customer pays only a fuel-cost share, cheaper than Ola/Uber/Rapido.
- Scope of THIS task: only the Customer Home experience plus a small design system. Do not design any other screens yet.
- Content rules: currency is Rs (use the rupee symbol). In user-facing text say "fuel share". Never use "earn", "income", "commission" or "fare". UI text in English. Use fictional sample data only.

DESIGN DIRECTION
- Pattern: full-screen map with a draggable bottom sheet, like Rapido/Uber. The look must be original: do not copy any brand's logo, colors or assets.
- Mood: friendly, trustworthy, clean, student-friendly. Light theme only. One-handed use, so primary actions sit in the bottom half.
- Frame: 390 x 844, portrait. Include a simple status bar and home indicator.

DESIGN TOKENS (create as Figma Variables and Text Styles)
- Colors: Primary #3B5BDB, Primary-dark #2B44B0, Primary-light #EDF1FF, Success #12B76A, Warning #F79009, Danger/SOS #E5484D, Text-primary #101828, Text-secondary #667085, Border #E4E7EC, Surface #FFFFFF, Background #F7F8FA.
- Type: Inter. H1 24/32 Semi Bold, H2 20/28 Semi Bold, Title 16/24 Semi Bold, Body 14/20 Regular, Caption 12/16 Medium. (In Figma the Inter style name is "Semi Bold" with a space.)
- Spacing scale: 4, 8, 12, 16, 24, 32.
- Radius: 8 (inputs), 12 (cards), 16 (buttons), 24 (sheet top corners), full (chips, pills).
- Sheet shadow: 0 -4 20 rgba(16,24,40,0.12).

COMPONENTS (real Figma components or component sets with variant properties, Auto Layout, slash naming)
- Button/Primary, Button/Secondary, Button/Danger (height 52; states: default, pressed, disabled)
- Chip/Place (icon + label, e.g. Home, College), Chip/Day (selected, unselected)
- Input/Search ("Where to?"), Input/Location (pickup and drop, with dot indicators)
- Toggle, Badge/Verified, Pill/Status (Pending, Rider found, On the way)
- Avatar, Rating (star + 4.8)
- Card/UpcomingRide, Card/Rider (photo placeholder, name, rating, bike number, verified badge, call button), Card/OTP (4 digits)
- Sheet container (drag handle, 24 top radius), Bottom nav (Home, My Tickets, Profile; active/inactive)
- Top bar: avatar button, role switch (Customer / Rider segmented control), notification bell
- Map/Placeholder: a stylized vector city map (soft blocks, roads, green and water patches). Do not use a real map.
- Map markers: UserDot, PickupPin, DropPin, BikeMarker (with heading rotation), RouteLine
- SOS button, Share-trip button
- Icons: simple 24px line icons (Lucide style) inserted as SVG vectors.

SCREENS (page "01 Customer Home"; frames named Screen/CustomerHome/<State>)
Sheet height anchors: peek ~280px, half ~500px, full ~760px.
1. Idle (peek): map with the user's blue dot and a recenter button. Top bar. Sheet: drag handle, "Where to?" search input, saved chips (Home, College), Card/UpcomingRide ("Tomorrow, 8:15 AM - Mansarovar to VGU Jaipur - Waiting for rider"). Bottom nav visible only in this state.
2. Searching (full): map dimmed behind. Pickup (prefilled "Current location") and drop fields, saved chips, "Choose on map" row, and 3 recent routes.
3. Ticket form (half): map camera fits pickup and drop with the route line drawn. Sheet shows a route summary (10.2 km, about 28 min), a time window selector (8:00 - 8:30 AM), day chips M T W T F S (Mon-Fri selected), a "Repeat weekly" toggle, a "Women riders only" toggle, an estimated fuel share row ("Rs 40 per ride" with an info icon), and a Primary button "Raise Ticket".
4. Waiting (peek): pulsing radar placeholder (concentric circles), "Finding a rider on your route...", a ticket summary, and a "Cancel ticket" button.
5. Rider accepted (half): Pill/Status "Rider found", Card/Rider (sample: "Rohit S.", 4.8, fictional plate, "Verified - VGU, 3rd year"), pickup point and time, fuel share, and "Call" and "Cancel" buttons.
6. Ride day, rider arriving (half): live BikeMarker approaching the pickup with a dashed line. Sheet: "Rider arrives in 4 min", compact Card/Rider, Card/OTP with sample digits 4 8 2 1 and the caption "Share this OTP with your rider to start", and SOS and Share-trip buttons in a row.
7. Ride in progress (peek): destination ETA, SOS, Share trip.

PROTOTYPE
Connect the frames with prototype links using Smart Animate, ease-out, 300ms: tap "Where to?" -> state 2; select a destination -> 3; "Raise Ticket" -> 4; then continue through 5, 6, 7. Keep the sheet, drag handle and map layers named identically across frames so Smart Animate matches them and the sheet slides smoothly.

FLUTTER-READY RULES
- Auto Layout everywhere. Absolute positioning only for map markers and overlays.
- Every color, text style and radius must come from variables or styles. No hard-coded values.
- Consistent layer names. No hidden or unused layers. No detached instances.
- Every repeated element is a component with variants or properties.
- Icons are vectors marked exportable as SVG. Photos are placeholders.

HANDOFF
When done, send me: the Figma file link, a link or node id for each frame, a list of the components and variables you created, and anything you had to approximate. Do not start any other screens. Ask me first.