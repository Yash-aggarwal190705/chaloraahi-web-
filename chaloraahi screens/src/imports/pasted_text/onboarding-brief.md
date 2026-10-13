ROLE
You are a senior mobile UI/UX designer working directly in Figma through the Figma MCP tools. You are extending an existing design, not starting a new one. Design production-ready, developer-friendly mobile screens that will later be converted into Flutter.

EXISTING FILE (read this first)
Figma file: [PASTE FIGMA FILE LINK HERE]
It already contains Customer Home screens, Rider screens, and a shared design system (variables, text styles, components). Before designing anything:
1. Load the figma-use guidance (the /figma-use skill, or skill://figma/figma-use/SKILL.md), as the use_figma tool requires.
2. Inspect the file with get_metadata, get_variable_defs and get_design_context on the existing frames. Take at least two screenshots so you match the established look.
3. REUSE existing variables, text styles and components (buttons, inputs, chips, toggles, avatar, badge, top bar, bottom sheet container, icons). Do not recreate or restyle them. Create new components only when this brief lists something that does not exist yet.
4. Add a new page called "00 Onboarding" and place it FIRST in the page order, before "01 Customer" and "02 Rider", since this is the entry flow.
5. Build in stages with use_figma. After each stage, call get_screenshot and check alignment, text clipping, overflow and contrast. Fix problems before moving on.

PROJECT CONTEXT
- App: CampusRide (working name), a verified, closed-community ride-sharing app for daily commutes, starting with college students in Jaipur, India.
- Onboarding must establish trust immediately: this is a verified-community app, not an open marketplace like Ola/Uber. Every screen should reinforce "verified", "safe" and "your college community."
- A user can be a Customer, a Rider, or both — role is chosen after signup, and can include both roles on one account.
- Content rules: currency is Rs. Never use "driver," "earn," "fare" or "commission" anywhere, including placeholder/microcopy text. UI text in English. Use fictional sample data only (no real names, emails or ID numbers).

DESIGN DIRECTION
- Same look as existing screens: light theme, friendly, trustworthy, 390 x 844 frames, one-handed use, primary actions in the bottom half where possible.
- Onboarding screens are mostly full-screen forms (not the map + bottom sheet pattern used elsewhere) — centered content, generous spacing, a persistent primary button anchored near the bottom.
- Keep total onboarding to as few taps as possible; each screen should feel like quick progress, not a long form.

NEW COMPONENTS (Auto Layout, variants and properties, slash naming; reuse existing tokens for color/type/radius)
- Onboarding/IllustrationSlide (image/illustration placeholder area + headline + subtext, used in the splash carousel)
- Dots/PageIndicator (active/inactive states)
- Input/Email, Input/Text (label, placeholder, helper text, error state)
- Button/Google (icon + "Continue with Google")
- Stepper/Header (reuse if it already exists from the Rider flow; otherwise create: shows step X of Y with a thin progress bar)
- Card/RoleOption (icon, title, short description, selectable state — used for Customer vs Rider vs Both)
- Input/Upload (reuse if it exists from Rider Setup; otherwise create: states empty, uploading, uploaded, error, with a small preview thumbnail once uploaded)
- Banner/TrustNote (small icon + one-line reassurance text, e.g. about how verification data is used)
- Status/VerificationPending, Status/VerificationRejected (illustration + headline + subtext + action button, as full-page states)
- Checkbox/Consent (used for terms acceptance)

SCREENS (page "00 Onboarding"; frames named Screen/Onboarding/<State>)

GROUP A — Welcome
A1. Splash — Slide 1: full-bleed illustration placeholder, headline "Share your daily ride", subtext "Verified students from your own college, going your way", Dots/PageIndicator (1 of 3), "Skip" text button top-right, "Next" primary button.
A2. Splash — Slide 2: illustration placeholder, headline "Only fuel cost, shared", subtext "No fares, no surge — just splitting the ride you're already taking", Dots/PageIndicator (2 of 3).
A3. Splash — Slide 3: illustration placeholder, headline "Safety comes first", subtext "ID verification, live trip sharing and an SOS button on every ride", Dots/PageIndicator (3 of 3), primary button changes to "Get Started".

GROUP B — Authentication
B1. Sign Up / Log In: app logo/wordmark placeholder near the top, headline "Welcome to CampusRide", Input/Email ("College or work email"), primary Button "Continue with Email", a divider labeled "or", Button/Google "Continue with Google", and small footer text "By continuing, you agree to our Terms and Privacy Policy" with the terms/privacy words as tappable links (styled, not necessarily separate frames).
B2. Email Link Sent (confirmation state): centered illustration placeholder, headline "Check your inbox", subtext "We sent a sign-in link to [sample email]. Tap it on this device to continue.", a "Resend link" text button (with a 30s countdown state shown as a variant), and "Use a different email" link.
B3. Basic Profile: Input/Text for full name, a circular photo-upload placeholder with a camera icon overlay (empty and filled states), Input/Text for a general "area/locality" (helper text: "Just your area, not your full address"), primary Button "Continue".

GROUP C — Verification
C1. College ID Upload: Stepper/Header ("Step 1 of 2"), headline "Verify you're a student here", Banner/TrustNote ("Used only to confirm your college. Never shown to other users."), Input/Upload for the ID card (front only), and a small caption showing an example of an acceptable photo. Primary Button "Submit for verification" (disabled until uploaded).
C2. Consent & Community Guidelines: Stepper/Header ("Step 2 of 2"), three short guideline rows with icons (e.g. "Only pay or accept fuel-cost sharing", "Treat your co-rider with respect", "Follow traffic and safety rules"), Checkbox/Consent ("I agree to the Community Guidelines"), primary Button "Finish".
C3. Verification Pending: Status/VerificationPending — illustration placeholder, headline "We're verifying your ID", subtext "This usually takes under 24 hours. We'll notify you the moment you're verified.", a disabled/secondary button "Explore the app" (limited access) and a note that full features unlock after verification.
C4. Verification Approved (success state, brief/toast-like full screen): checkmark illustration, headline "You're verified!", subtext "Welcome to the CampusRide community.", primary Button "Continue".
C5. Verification Rejected: Status/VerificationRejected — illustration placeholder, headline "We couldn't verify your ID", subtext with a sample reason ("The photo was blurry — please try again"), primary Button "Re-upload ID", secondary text link "Contact support".

GROUP D — Role Selection
D1. Choose Your Role: headline "How will you use CampusRide?", subtext "You can change this anytime in Settings", three Card/RoleOption items stacked vertically — "Customer" (I need a ride), "Rider" (I have a vehicle and go regularly), "Both" — each selectable with a clear selected state (border + check), primary Button "Continue" (disabled until one is selected).
D2. Role Confirmation / Handoff: a short full-screen confirmation matching the chosen role, e.g. for Customer: illustration + "You're all set to find your first ride" + primary Button "Find a ride" (leads conceptually to Customer Home); for Rider: "Let's get your vehicle verified" + primary Button "Set up as a Rider" (leads conceptually to the existing Rider Setup flow on page "02 Rider"); for Both: both options shown as two secondary buttons stacked.

PROTOTYPE
Connect frames with Smart Animate, ease-out, 300ms, in this order: A1 → A2 → A3 → B1 → B2 → B3 → C1 → C2 → C3 → C4 → D1 → D2. From D2's Rider path, add a prototype link to the first frame of the existing "Rider Setup" flow on page "02 Rider" (Screen/Rider/A1) if that page/frame already exists in this file. From D2's Customer path, add a prototype link to the existing Customer Home idle frame on page "01 Customer" if it exists. Keep shared elements (buttons, headers) named identically across frames so transitions animate smoothly.

FLUTTER-READY RULES
- Auto Layout everywhere; no absolute positioning except illustration/photo placeholder areas.
- Every color, text style and radius comes from the existing shared variables and styles — no hard-coded values.
- Consistent layer names, no hidden or unused layers, no detached instances.
- Every repeated element (cards, inputs, buttons, status screens) is a component with variants or properties.
- Icons are vectors exportable as SVG. Photos/illustrations are placeholders only.

HANDOFF
When done, send me: the file link, a link or node id for every frame, the list of any new components/variables you added, and anything you had to approximate or assume. If a linked frame on the Customer or Rider pages doesn't exist yet, note that instead of guessing its design. Do not start any other screens. Ask me first.