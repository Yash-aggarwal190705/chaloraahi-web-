ROLE
You are a senior mobile UI/UX designer working directly in Figma through the Figma MCP tools. You are extending an existing design, not starting a new one. Design production-ready, developer-friendly mobile screens that will later be converted into Flutter.

EXISTING FILE (read this first)
Figma file: [PASTE FIGMA FILE LINK HERE]
It contains the finished Customer Home screens and a design system (variables, text styles, components). Before designing anything:
1. Load the figma-use guidance (the /figma-use skill, or skill://figma/figma-use/SKILL.md), as the use_figma tool requires.
2. Inspect the file with get_metadata, get_variable_defs and get_design_context on the existing Customer Home frames. Take a screenshot of at least two of them so you can match the look.
3. REUSE the existing variables, text styles and components (buttons, chips, toggles, avatar, rating, verified badge, status pill, sheet container, bottom nav, top bar with the Customer/Rider switch, map placeholder, map markers, SOS and Share-trip buttons, icons). Do not recreate or restyle them. Create new components only when this brief lists something that does not exist yet.
4. Add a new page called "02 Rider" in the same file. Do not modify or delete anything on the Customer page.
5. Build in stages with use_figma. After each stage, call get_screenshot and check alignment, text clipping, overflow and contrast. Fix problems before moving on.

PROJECT CONTEXT
- App: CampusRide (working name), a verified, closed-community ride-sharing app for daily commutes, starting with college students in Jaipur, India.
- A "Rider" is a bike or scooter owner who already travels a fixed route every day. A "Customer" raises a ticket (pickup, drop, time window). The Rider accepts it, and the Customer pays only a fuel-cost share.
- Scope of THIS task: Rider-side screens only, listed below.
- Content rules: currency is Rs. Use the words "fuel share" and "fuel cost covered". Never use "earn", "earnings", "income", "profit", "commission" or "fare". The Rider is not a driver-for-hire, so the UI must feel like cost sharing among people going the same way, not a job. UI text in English. Fictional sample data only. Never show a customer's phone number; use "Call (masked)".

DESIGN DIRECTION
- Same look as the Customer screens: light theme, friendly, trustworthy, one-handed use, 390 x 844 frames, primary actions in the bottom half, same map-plus-draggable-sheet pattern.
- The Rider mode is recognized by the role switch showing "Rider" active and a slightly different greeting. Do not introduce a new color palette.

NEW COMPONENTS (Auto Layout, variants and properties, slash naming)
- Stepper/Header (3 steps: current, done, upcoming)
- Input/Upload (states: empty, uploading, uploaded, error) for documents
- Toggle/Availability (large, labeled "Available today")
- Card/TodayTrip (route, time, seats left, edit button)
- Card/FuelCoverage (progress bar showing "Fuel cost covered this week: Rs 240 of about Rs 300")
- Card/TicketRequest (pickup to drop, time window, detour badge, fuel share, customer avatar with rating and verified badge, Accept and Decline buttons)
- Badge/Detour ("+0.6 km detour"), Badge/Match (e.g. "On your route")
- Card/CustomerSummary (avatar, first name, rating, rides taken, department and year, verified badge)
- Slider/Detour (0 to 3 km), Counter/Seats (1 to 2)
- Input/OTP (4 boxes: empty, filled, error) and a numeric keypad
- Checklist/Item (helmet ready, license with me, phone charged)
- Button/SlideToEnd (slide to end ride)
- Chip/Filter (Today, Tomorrow, Recurring), Chip/Tag for rating tags
- Tabs (Upcoming, Posted, Past), Banner/Info, EmptyState (simple placeholder illustration)
- Bottom nav for Rider: Home, Tickets (with count badge), Trips, Profile

SCREENS (page "02 Rider"; frames named Screen/Rider/<Group>/<State>)
Sheet height anchors as before: peek ~280px, half ~500px, full ~760px.

GROUP A - Setup and Home
A1. Rider Setup - Vehicle (step 1 of 3): vehicle type (Bike, Scooter), make and model, registration number, extra helmet toggle. Primary button "Continue".
A2. Rider Setup - Documents (step 2 of 3): driving license front and back (Input/Upload), registration certificate, and a note "Your documents are only used for verification". Show one uploaded and one empty state.
A3. Rider Setup - Community promise (step 3 of 3): three short rules with checkmarks: share only fuel cost, follow traffic rules, respect your co-rider. A required checkbox and the button "Submit for verification".
A4. Verification Status: Pending state (illustration, "We are checking your documents, usually within 24 hours"). Also a Verified variant and a Rejected variant with a reason and a "Fix and resubmit" button.
A5. Rider Home - Idle (peek): map with the rider's blue dot. Top bar with the role switch on "Rider". Sheet: Toggle/Availability, Card/TodayTrip ("Today, 5:30 PM - VGU Jaipur to Mansarovar - 1 seat"), Card/FuelCoverage, and a "Post a trip" button. Rider bottom nav.
A6. Rider Home - With requests (half): same as A5 plus a highlighted "3 new ticket requests on your route" card with a "View requests" button.
A7. Post a Trip (full sheet): from and to fields, departure time, day chips (Mon-Sat), Counter/Seats, Slider/Detour ("I can detour up to 1.5 km"), "Women riders' co-riders only" toggle, a live summary ("Estimated fuel share: Rs 4 per km"), and a Primary button "Post trip".

GROUP B - Tickets
B1. Available Tickets - List: title, Chip/Filter row (Today, Tomorrow, Recurring), a sort control ("Least detour"), and 4 Card/TicketRequest items with different data. Rider bottom nav with the Tickets badge.
B2. Available Tickets - Empty: EmptyState and the text "No requests on your route right now. We will notify you." Include a "Post a trip" button.
B3. Ticket Detail (half sheet over map): map showing the rider's usual route, the customer's pickup and drop pins, and the detour segment highlighted. Sheet: Card/CustomerSummary, time window, distance, detour, fuel share breakdown (distance x rate, platform fee Rs 3, total), and buttons "Accept" (primary) and "Decline".
B4. Ticket Accepted (peek sheet with a success state): "Ticket accepted", pickup point and time, "Call (masked)" and "Cancel" buttons, and a reminder "Cancelling late affects your rating".

GROUP C - Ride day
C1. Heading to Pickup (half): map with the route to the pickup pin, "Pickup in 6 min", Card/CustomerSummary (compact), Checklist/Item list (helmet, license, phone), and the button "I have reached pickup". SOS and Share-trip buttons visible.
C2. Verify OTP (full sheet): "Ask your co-rider for the 4-digit OTP", Input/OTP with a numeric keypad, an error variant ("Wrong OTP, try again"), and a "Start ride" button that is disabled until 4 digits are entered.
C3. Ride in Progress (peek): map with the route to drop, ETA, distance left, SOS, Share trip, and Button/SlideToEnd.
C4. Ride Summary (full): a success header, then rows: distance, fuel share, platform fee, total, and a payment mode selector (Cash, UPI). A line "Fuel cost covered this week" updates with a small progress bar. Primary button "Confirm payment received".
C5. Rate your co-rider: avatar, 5 stars, Chip/Tag options ("On time", "Friendly", "Followed rules", "Ready with OTP"), an optional comment, and "Submit".

PROTOTYPE
Connect the frames with prototype links using Smart Animate, ease-out, 300ms: A5 to B1 via "View requests", B1 to B3 by tapping a card, B3 to B4 via "Accept", B4 to C1, C1 to C2 via "I have reached pickup", C2 to C3 via "Start ride", C3 to C4 via the slide, C4 to C5. Also link A5 to A7 through "Post a trip". Keep the sheet, drag handle and map layers named identically across frames so the sheet animates smoothly.

FLUTTER-READY RULES
- Auto Layout everywhere; absolute positioning only for map markers and overlays.
- Every color, text style and radius comes from existing variables and styles. No hard-coded values.
- Consistent layer names, no hidden or unused layers, no detached instances.
- Every repeated element is a component with variants or properties.
- Icons are vectors exportable as SVG. Photos are placeholders.

HANDOFF
When done, send me: the file link, a link or node id for every frame, the list of new components and variables you added, and anything you had to approximate. If the existing Customer design system is missing something you need, tell me before adding it. Do not start any other screens.