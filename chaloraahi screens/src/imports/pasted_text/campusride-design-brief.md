ROLE
You are a senior mobile UI/UX designer working directly in Figma through the Figma MCP tools. You are extending an existing design, not starting a new one. Design production-ready, developer-friendly mobile screens that will later be converted into Flutter.

EXISTING FILE (read this first)
Figma file: [PASTE FIGMA FILE LINK HERE]
It already contains Onboarding, Customer, and Rider pages, plus a shared design system (variables, text styles, components). Before designing anything:
1. Load the figma-use guidance (the /figma-use skill, or skill://figma/figma-use/SKILL.md), as the use_figma tool requires.
2. Inspect the file with get_metadata, get_variable_defs and get_design_context on the existing frames. Take at least two screenshots so you match the established look.
3. REUSE existing variables, text styles and components (buttons, inputs, chips, toggles, avatar, badge, rating, verified badge, top bar, bottom nav, sheet container, icons). Do not recreate or restyle them. Create new components only when this brief lists something that does not exist yet.
4. Add a new page called "03 Common" and place it after "02 Rider".
5. Build in stages with use_figma. After each stage, call get_screenshot and check alignment, text clipping, overflow and contrast. Fix problems before moving on.

PROJECT CONTEXT
- App: CampusRide (working name), a verified, closed-community ride-sharing app for daily commutes, starting with college students in Jaipur, India.
- These screens are shared by both Customer and Rider roles — the same account can hold both roles, so Profile & Settings must reflect that.
- Content rules: currency is Rs. Never use "driver," "earn," "fare," "income" or "commission" anywhere, including placeholder/microcopy text — use "fuel share" instead. UI text in English. Fictional sample data only. Never display another user's raw phone number; show "Call (masked)" instead.
- Pricing logic to reflect accurately wherever a fare/cost breakdown is shown: Total = (distance x fixed Rs per km fuel-share rate) + flat platform fee. Always show this as two separate line items (fuel share, platform fee) plus a total — never a single blended number — so the cost-sharing framing stays clear.

DESIGN DIRECTION
- Same look as existing screens: light theme, friendly, trustworthy, 390 x 844 frames, one-handed use.
- Notifications and Profile & Settings are list-based, full-screen pages (not the map + bottom sheet pattern) with a simple top app bar (back arrow or screen title, no map underneath).
- Use the existing bottom navigation component on any screen that is a top-level tab destination (Profile), and a plain top bar with a back arrow on any screen reached by drilling in (Notifications, Edit Profile, Ride History, Help & Support, etc.).

NEW COMPONENTS (Auto Layout, variants and properties, slash naming; reuse existing tokens for color/type/radius)
- ListItem/Notification (icon or avatar, title, one-line description, relative timestamp, unread-state dot, tap target)
- ListItem/Setting (leading icon, label, trailing value/chevron/toggle — build as a variant set covering: navigation row, toggle row, and value-display row)
- ListItem/RideHistory (route summary "A to B", date, amount paid or received, status pill, small chevron)
- SegmentedControl/Tabs (for Notifications: All / Rides / Alerts; for Ride History: As Customer / As Rider)
- Card/ProfileHeader (avatar, name, verified badge, rating with star, "Customer" and "Rider" role pills shown together when both roles are active)
- Card/EmergencyContact (name, relationship, phone, edit/delete affordance)
- Card/CostBreakdown (route/date header, then line items: distance, fuel share, platform fee, divider, total, payment mode)
- EmptyState (small illustration placeholder + one line, reused pattern from the Rider page if it exists there — otherwise create it here)
- FAQ/AccordionItem (question row that expands to show an answer, collapsed and expanded states)
- Toggle (reuse if it exists; otherwise create: on/off states, used for notification preferences)

SCREENS (page "03 Common"; frames named Screen/Common/<Group>/<State>)

GROUP A — Notifications
A1. Notifications — List: top bar titled "Notifications", SegmentedControl/Tabs (All / Rides / Alerts), a chronological list of ListItem/Notification covering these sample cases: "Your ticket was accepted by Rohit S.", "Your ride starts in 30 minutes", "Priya cancelled your ride for tomorrow", "New matching ticket on your route" (rider-facing), "You're verified! Welcome to CampusRide" — mix of read and unread (unread shown with a dot and slightly bolder background).
A2. Notifications — Empty: EmptyState with the text "No notifications yet. We'll let you know when something needs your attention."
A3. Notification detail / tap-through (optional, brief): a short full-page view for a single notification, e.g. the "ticket accepted" one, showing the relevant ride summary card and a primary button that says where it would lead (e.g. "View ride details") — this is just to show the interaction pattern, not a fully built destination.

GROUP B — Profile & Settings (top-level tab, uses bottom nav)
B1. Profile — Home: Card/ProfileHeader at top (sample name, verified badge, rating, both role pills shown), then a grouped settings list using ListItem/Setting:
   - Group "Account": Edit Profile, Verification Status, Emergency Contact
   - Group "Activity": Ride History, Payment Mode preference (Cash/UPI), Notification Preferences
   - Group "Trust & Safety": Safety Center, Women-only Matching (toggle row), Report a Problem
   - Group "Support": Help & Support, Terms & Privacy, About CampusRide
   - A "Log Out" row styled distinctly (e.g. danger-colored text, no icon background) near the bottom.
   Bottom nav present and on the Profile tab.
B2. Edit Profile: top bar with back arrow, avatar with an edit/camera overlay, Input/Text fields for name and area/locality (reuse from Onboarding), a read-only row showing the verified college email, primary Button "Save Changes".
B3. Verification Status: top bar with back arrow, current status shown clearly (use the existing Status/VerificationPending or a "Verified" variant of it from the Onboarding page if it exists there), plus a "Re-verify" or "Update ID" action if rejected, and a short note on why verification matters.
B4. Emergency Contact: top bar with back arrow, a list of Card/EmergencyContact items (support at least 2), an "Add emergency contact" row with a plus icon, and a short trust note explaining this contact receives the trip-sharing link during SOS or "Share trip" use.
B5. Ride History — List: top bar with back arrow, SegmentedControl/Tabs (As Customer / As Rider), a list of ListItem/RideHistory items with a mix of statuses (Completed, Cancelled), and an EmptyState variant for when a tab has no rides yet.
B6. Ride History — Detail: top bar with back arrow, route and date header, a small static map-placeholder thumbnail (not live, just a snapshot-style visual), the other party's Card/ProfileHeader (compact), and Card/CostBreakdown showing the fuel share + platform fee + total using the pricing formula above, plus the rating given/received for that ride.
B7. Notification Preferences: top bar with back arrow, a list of Toggle rows: "Ticket accepted", "Ride reminders", "Cancellations", "New matching tickets" (rider-facing), "Promotions and updates" — grouped under "Ride Alerts" and "General".
B8. Help & Support: top bar with back arrow, a prominent "Contact Support" button/card at the top, then a list of FAQ/AccordionItem entries (at least 5 sample questions relevant to this app, e.g. "How is the fuel share calculated?", "What if my rider cancels?", "How does verification work?"), with one item shown in its expanded state to demonstrate the pattern.
B9. Safety Center: top bar with back arrow, a short intro line, then a list of safety features presented as simple rows or small cards: SOS button explainer, Share Trip explainer, ID Verification explainer, Community Guidelines link, and an emergency-contact quick-edit shortcut linking to B4.

PROTOTYPE
Connect frames with Smart Animate, ease-out, 300ms: B1 -> B2, B1 -> B3, B1 -> B4, B1 -> B5 -> B6, B1 -> B7, B1 -> B8, B1 -> B9 -> B4. Link the bottom nav's Profile tab on B1 as the entry point. If a bottom nav component with a "Home" tab already exists on the Customer or Rider pages, link B1's Home tab back to the appropriate existing home frame (Customer Home idle or Rider Home idle) instead of leaving it disconnected. Link A1's notification items to A3 as an example tap-through. If a bell icon already exists in the shared top bar component, add a link from that icon (on Customer Home and Rider Home, if those frames exist) to A1.

FLUTTER-READY RULES
- Auto Layout everywhere; no absolute positioning except the static map-thumbnail placeholder in B6.
- Every color, text style and radius comes from the existing shared variables and styles — no hard-coded values.
- Consistent layer names, no hidden or unused layers, no detached instances.
- Every repeated element (list items, cards, toggle rows) is a component with variants or properties.
- Icons are vectors exportable as SVG.

HANDOFF
When done, send me: the file link, a link or node id for every frame, the list of any new components/variables you added, and anything you had to approximate or assume. If a linked frame on another page doesn't exist yet, note that instead of guessing its design. Do not start any other screens. Ask me first.