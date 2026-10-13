Refine the existing SOS flow into a polished, accessible, fully connected mobile prototype.

The target is a 10/10-quality experience: visually clear, usable under stress, honest about what the system has actually done, and consistent with the rest of the app. Do not simply restyle the screens or award yourself a 10/10 score. Implement the interactions and verify the journeys described below.

# 1. Product and implementation context

The app is ChaloRaahi, a verified, closed-community two-wheeler commute-sharing product for a Jaipur campus community.

Use ChaloRaahi consistently. If the project already has a deliberately finalized alternative brand, use that brand consistently instead of mixing names.

The two roles are:
- Passenger: requests and joins a ride.
- Rider: provides the bike/scooter and shares an existing commute.

This is an existing React + Vite + Tailwind CSS prototype. Start by inspecting:
- src/SOSFlow.tsx
- src/App.tsx
- Relevant SOS and Share trip entry points in src/RiderFlow.tsx
- Emergency Contact, Safety Center, and report/support destinations in src/CommonFlow.tsx
- src/index.css

If available, also follow:
- docs/PRD.md
- docs/SAFETY-OPERATIONS.md
- docs/PRIVACY-RETENTION.md
- docs/Domain-Model.md
- docs/API-SPEC.md

Reuse existing components, state patterns, icons, typography, and navigation. Make the smallest coherent implementation that satisfies the complete flow.

Do not add a new routing framework, state-management library, calling SDK, map package, or backend service for this prototype.

Preserve the existing onboarding, Passenger, Rider, and Profile/Common design language. Make only the shared integration changes needed for SOS, calling, contacts, sharing, and reporting.

# 2. Existing states to refine

Retain these identifiers for compatibility with the screen picker:

1. sos-confirm
2. sos-holding
3. sos-active
4. sos-calling
5. sos-shared
6. sos-cancel-confirm
7. sos-ended

These are seven reviewable states, not necessarily seven separate page implementations.

In particular:
- Confirm and Holding should be states of the same stable sheet and control.
- Active and Shared should reuse the same emergency dashboard.
- Calling should represent a phone-app handoff, not a custom telephone service.
- Pending, offline, failed, and acknowledged conditions should generally be variants within these states.

# 3. Non-negotiable safety and truthfulness rules

Emergency assistance, alert submission, notification delivery, trip sharing, ride progress, and safety-case status are different things.

Never imply:
- A responder has been dispatched because an alert was submitted.
- A contact received or read a message because a share sheet opened.
- A phone call connected because the app requested a dialer handoff.
- Location is live when it is stale, unavailable, or merely simulated.
- The user is physically safe because they ended an SOS session.
- Ending SOS completes the ride or closes a safety case.

Use “Call emergency services · 112” rather than “Call Police,” because the emergency action should not be presented as police-only assistance.

Use the project’s configured, verified campus-security information. Do not invent a campus telephone number, operating hours, response SLA, or guaranteed monitoring coverage.

Make emergency telephone information available even when:
- Internet connectivity is unavailable.
- Location permission is denied.
- No emergency contact is saved.
- Contact-sharing consent is off.
- In-app submission fails.
- The user needs to renew authentication.

Explain device/network limitations accurately. Do not promise a telephone call can connect without a usable telephone service.

In the prototype:
- Use synthetic identities and scenario data.
- Clearly label simulated alerts, tracking, dispatch, and phone handoffs.
- Keep scenario controls outside the phone frame.
- Do not automatically call real emergency numbers or send real messages during prototype testing.

A compact in-phone demo indicator is appropriate when simulated outcomes could otherwise look real. The external scenario controls alone are not enough to make an apparent successful emergency action honest.

# 4. Shared visual system

Use the established app styling:
- Font: Inter.
- Primary: #3B5BDB.
- Pressed primary: #2F49B5.
- Main text: #101828.
- Supporting text: #475467 or #667085.
- White and light neutral surfaces.
- Restrained emergency red accents.
- Green only for a genuinely completed, narrowly defined action.

Typography:
- Screen/sheet titles: approximately 20–24 px.
- Body and action labels: 14–16 px.
- Supporting copy: 13–14 px.
- Avoid the current 11 px emergency-action captions.
- Allow labels to wrap without clipping.

Interaction:
- Minimum 48 × 48 px actionable targets.
- Visible keyboard focus.
- Clear pressed, disabled, pending, and error feedback.
- Do not rely on color, pulsing dots, or icons alone.

Use a calm emergency interface:
- Strong hierarchy.
- Short, concrete instructions.
- No decorative SOS emoji as the main control.
- No full-screen flashing, alarm-like animation, confetti, or celebratory success treatment.
- No dense explanatory paragraphs above the emergency actions.

Use a responsive bottom sheet that can expand into a full-height surface on short screens or with enlarged text.

Keep emergency actions easy to reach. Scroll secondary information, not the only way to call for help.

# 5. Screen 1 — sos-confirm

## Purpose

Help the user choose between immediate emergency calling and sending an in-app SOS alert, while preventing accidental alert activation.

## Current problems to fix

The current screen:
- Promises that the contact will be alerted and live location shared before checking the relevant state.
- Mentions 112 only in a small disclaimer.
- Starts the next screen on touch/mouse-down.
- Does not clearly state the hold duration or accessible alternative.

## Revised layout

Top:
- Title: “Emergency SOS”
- Supporting copy:
  “In immediate danger? Call emergency services.”
- Prominent action:
  “Call emergency services · 112”

Below:
- Short explanation:
  “Send an in-app emergency alert. Your selected contact may also be notified if emergency sharing is enabled.”

Show a compact context summary:
- Current ride or meetup.
- Selected emergency contact, if one exists.
- Whether contact notifications are enabled.
- Whether trip sharing is already active.

Do not show every detail at once. Use readable rows and brief state labels.

Main SOS control:
- A large, clearly labelled hold button.
- Prototype default: a continuous 3-second hold.
- Label: “Hold 3 seconds to send SOS”
- Supporting instruction: “Release to cancel.”

The 3-second duration is a prototype UX choice, not an established operational policy. Keep the duration and its displayed copy consistent through one shared value.

Provide an accessible alternative:
- “Send without holding”
- Opens a short confirmation within this same flow.
- Confirmation action: “Send SOS alert”
- Secondary action: “Go back”

This alternative must work with keyboard, screen reader, and switch input.

Bottom:
- Secondary action: “Go back”
- Brief service limitation:
  “An in-app alert does not guarantee emergency assistance.”

## Contact and location variants

If no emergency contact exists:
- Show “No emergency contact selected.”
- Explain that contact notification is unavailable.
- Keep emergency calling and an authorized in-app alert available.
- “Add contact” is secondary and must not be required before calling or requesting an alert.

If contact-sharing consent is off:
- Show “Contact notifications are off.”
- Do not silently enable them.
- Do not assume saving a telephone number grants permission to dispatch messages.

If this is a meetup before the ride has started:
- Show “Ride not started · live tracking is off.”
- Do not begin rider or Passenger tracking simply because SOS was opened.

If there is no authorized ride context:
- Preserve emergency calling and appropriate reporting/support access.
- Do not invent a ride ID or submit to an unsupported endpoint.

## Navigation

Closing this pre-activation sheet returns to the exact originating screen and role.

Opening the sheet must not:
- Start a ride.
- Reset booking details.
- Switch Rider to Passenger.
- Create an alert.
- Notify contacts.
- Begin tracking.

## Why this change matters

Calling for immediate assistance becomes visible before an alert gesture, and the user understands what the in-app action can actually do.

# 6. Screen 2 — sos-holding

## Purpose

Prevent accidental activation through a genuine continuous hold.

## Critical behavior correction

The current implementation transitions away from the pressed button and runs a timer that completes even after release.

Replace that behavior.

Keep the same control mounted and stable throughout Confirm → Holding. Do not replace the pressed button with an unrelated progress element.

Handle:
- Pointer down.
- Pointer up.
- Pointer cancellation.
- Movement outside the allowed activation area.
- Lost pointer capture.
- Relevant focus loss.
- Sheet dismissal.
- App/tab becoming hidden before activation.

If the hold is interrupted before the threshold:
- Stop immediately.
- Reset progress.
- Return to the ready state.
- Do not dispatch anything.
- Announce “SOS not sent” when useful.

Use one consistent pointer-event path rather than independent touch and mouse activation paths that can duplicate a gesture.

Compute progress from elapsed hold time, not arbitrary percentage increments.

At the threshold:
- Dispatch once.
- Ignore stale callbacks and repeated pointer events.
- Move immediately to the pending emergency dashboard.

Do not add a second automatic countdown after the completed hold.

## Visual feedback

Show:
- A restrained progress ring.
- Text countdown such as “Keep holding · 2 seconds”
- Supporting text: “Release to cancel.”

Prefer seconds over the current percentage display. Seconds communicate the remaining effort more clearly under stress.

Keep “Call emergency services · 112” available. If the user chooses a call action during a hold, cancel the unfinished hold first.

Reduced-motion mode:
- Retain the text countdown.
- Remove decorative pulsing.
- Do not make understanding progress depend on animation.

Screen reader:
- Announce meaningful stages, not every animation frame.
- Keep the non-hold confirmation path available.

Remove unused ring calculations or duplicate progress logic as part of this correction.

## Why this change matters

The safeguard must actually prevent accidental dispatch. A countdown that continues after release is an activation bug, not just a visual imperfection.

# 7. Screen 3 — sos-active

## Purpose

Provide a clear emergency dashboard with immediate actions and truthful status.

## Current problems to fix

The current implementation:
- Shows an unconditional “SOS Activated” state.
- Leaves emergency-services and campus-security buttons unwired.
- Displays “Live Location Shared” without a corresponding verified outcome.
- Shows static successful timeline entries.
- Declares onShareConfirm without connecting it to a usable action.

Fix the shared action component and every SOS instance that uses it.

## Revised hierarchy

### A. Header and submission status

Title: “Emergency SOS”

Show the actual alert state immediately beneath it:
- “Sending alert…”
- “Alert submitted”
- “Submission not confirmed”
- “Alert not sent”
- “Support acknowledged” only after a genuine operator acknowledgement.

An alert accepted by the server is not the same as a human reviewing it.

An elapsed label may read:
- “Since you started SOS · 00:18”

Do not label this as time since responder dispatch or support acknowledgement.

### B. Immediate actions

Primary:
- “Call emergency services · 112”

Secondary:
- “Call [selected contact name]”
- “Call campus security”

Show contact identity clearly enough to prevent calling the wrong person:
- Name.
- Relationship when available.
- Recognizable telephone suffix or approved display.

Use the same contact selected in Profile/Common. Do not keep “Riya M.” here while the contact settings show a different person.

For multiple contacts:
- Reuse the existing primary/selected-contact model.
- A compact selector is acceptable.
- Do not silently notify every saved contact.

If the campus number is unavailable:
- Say “Campus security number unavailable.”
- Keep the emergency-services action visible.
- Do not leave a normal-looking button with no behavior.

If a stored telephone number is invalid or only a masked placeholder:
- Do not construct a telephone action from it.
- Explain the unavailable action and retain valid alternatives.

### C. Alert/contact status card

Separate:
- In-app alert submission.
- Trusted-contact dispatch.
- Delivery confirmation, if supported.
- Operator acknowledgement, if supported.

Examples:
- “Alert submitted at [time].”
- “Message queued for [name].”
- “Message sent · delivery not confirmed.”
- “Couldn’t send the contact notification.”
- “No contact notification requested.”

Do not display a green “delivered” check because a request was merely accepted.

### D. Ride location card

Show:
- “Ride location” or “Rider location,” identifying the actual source.
- Live, stale, last-known, or unavailable state.
- Last recorded update time.
- Accuracy when available.
- A small map only if it adds useful context.

Example copy:
- “Rider location · updated 8 seconds ago.”
- “Last known rider location · updated 2 minutes ago.”
- “Location unavailable. You can still call for help.”

Passenger tracking is not collected by default. Do not describe the rider’s coordinates as the Passenger’s independently tracked location.

Use the configured freshness threshold. If no configuration exists in the demo, use the documented proposed 30-second threshold consistently and identify it as a prototype assumption.

Do not animate a stationary or stale pin to suggest current movement.

### E. Sharing controls

Provide a real action:
- “Share trip”
- Or “Manage trip sharing” if a link already exists.

Keep status and action separate. A green status tile is not a substitute for a wired button.

This action must reach the sharing detail/confirmation state through normal navigation.

### F. Activity details

Place the activity log below urgent actions and status.

Use real or explicitly simulated event data:
- Local SOS request started.
- Alert submitted.
- Contact notification requested.
- Message sent or failed.
- Phone-app handoff requested.
- Sharing link created or revoked.
- Safe-status update requested/confirmed.

Use event timestamps. Do not repeat the current hardcoded 8:42 PM entries.

Do not label an event “Call connected” or “Contact read message” without that evidence.

### G. Session controls

Provide:
- “Back to ride” to minimize the surface.
- “I’m safe / end SOS” to open the end confirmation.

Minimizing the UI must not end the alert or erase its state.

When minimized, show a persistent ride-level status entry:
- “SOS alert active”
- “SOS submission pending”
- Or the relevant failure state.

Tapping it reopens the existing session rather than starting another hold.

## Why this change matters

The screen becomes an action-first emergency interface rather than a grid of partly decorative buttons and assumed successes.

# 8. Screen 4 — sos-calling

## Purpose

Represent a handoff to the device’s telephone functionality.

## Replace the current simulated calling screen

Remove:
- Fake live “Calling…” status.
- In-app mute and speaker buttons.
- In-app end-call control.
- Fake call duration.
- Any suggestion that ChaloRaahi controls an ordinary telephone call.

Use native telephone handoff where the actual environment supports it.

In Figma/browser preview, use a clearly labelled simulated handoff instead of placing a real emergency call.

## Revised state

Title:
- “Call [contact name]”
- Or “Call emergency services”

Show:
- Contact/service name.
- The configured number.
- Short explanation:
  “Use your phone app to place the call. Your in-app SOS status is separate.”

Actions:
- “Open phone app”
- “Copy number”
- “Return to SOS”

Where a direct user-initiated native handoff is available, avoid inserting unnecessary screens before the emergency dialer.

The retained sos-calling state can document the handoff, provide fallback, and support prototype review.

Feedback must reflect observability:
- “Phone-app handoff requested” is acceptable when that is all the app knows.
- Do not claim “Call connected.”
- Returning to the app does not prove a call occurred or ended.

If the device cannot handle the action:
- Keep the number selectable.
- Offer copy/manual dialing.
- Show a specific unavailable-state message.
- Do not trap the user on an endless loading screen.

If clipboard access fails:
- Offer manual selection.
- Do not show “Number copied.”

## State continuity

During phone handoff:
- SOS elapsed time continues.
- Submission/contact status remains intact.
- The originating role and ride remain intact.
- Sharing status remains intact.

Return to the dashboard with its current sharing and alert information, not a reset generic Active state.

## Why this change matters

The app should facilitate a real telephone action without impersonating a telephone connection it cannot observe or control.

# 9. Screen 5 — sos-shared

## Purpose

Explain what was shared, with whom, for how long, and what remains under the user’s control.

Treat this as the Active dashboard with an expanded sharing panel or contextual confirmation, not a duplicate dashboard with separate state logic.

## Fix reachability

Wire:
- Share trip.
- Manage trip sharing.
- View what was shared.

The Shared state must be reachable by ordinary user actions, not only the screen picker.

## Sharing details

Show:
- Link state: active, expired, revoked, unavailable, or creation pending.
- Selected recipient/channel when known.
- Creation time.
- Actual expiry time.
- Whether the displayed location is live or last known.

Expiry copy:
- “Access ends when the ride closes or at [expiry time], whichever comes first.”

Use the configured/server-provided expiry. The project’s maximum-six-hour value is proposed; do not invent a different entitlement or make an unsupported fixed promise.

Explain briefly:
- “Anyone with this link may be able to view the shared ride details until access ends.”
- “Recipients may forward the link or take a screenshot.”

Do not call it permanently private or impossible to forward.

## What the viewer can see

Wire “View what was shared” to a real preview/detail sheet.

Show only the authorized minimum projection:
- Participant display name.
- Necessary ride/route summary.
- Ride status.
- Rider location with freshness, if available.

Do not expose:
- Phone numbers.
- Identity or vehicle documents.
- OTPs.
- Internal safety-case details.
- Unrelated trips.
- Unnecessary private residential-address details.

## Actions

Provide applicable actions:
- “Share link”
- “Copy link”
- “View shared details”
- “Revoke link”

Use native sharing when available, with a copy fallback.

Represent outcomes accurately:
- “Link created” does not mean it was sent.
- “Share sheet opened” does not mean it was delivered.
- “Link copied” does not mean someone received it.
- “Message sent” does not mean it was read.
- Cancelling the share sheet must not produce a success banner.

If a native share action cannot identify the recipient, do not claim it was sent to a named person.

A cancelled share sheet may leave a previously created link active. Explain that state and allow revocation.

## Revocation

Use a short confirmation:
- Title: “Revoke this trip link?”
- Copy: “People with this link will lose access once revocation is confirmed. Information already viewed or captured cannot be recalled.”
- Confirm: “Revoke link”
- Secondary: “Keep sharing”

Only revoke links the current user is authorized to manage.

For offline/failed requests:
- Show “Revocation not confirmed.”
- Do not falsely claim access has stopped.
- Reconcile before retrying.
- Do not silently recreate a revoked link.

A revoked/expired viewer state must no longer expose the old location in the simulated preview.

Production access control must be enforced remotely. A frontend-only expiry animation is not real revocation; document the backend dependency.

## Why this change matters

Sharing becomes understandable and controllable without confusing link creation, sending, receipt, and location access.

# 10. Screen 6 — sos-cancel-confirm

## Purpose

Confirm the user’s intended session change without implying that it also changes the ride, tracking, sharing, or safety-case lifecycle.

## Correct the current promise

The current copy says ending SOS stops sharing live location. That is not automatically true and must not be implied.

Use this proposed prototype behavior:
- The participant submits a safe-status/end-session intent.
- The user-facing SOS session ends only after the simulated acknowledgement.
- The ride remains unchanged.
- Safety-case follow-up remains separate.
- Existing trip links remain active until separately revoked, expired, or closed with the ride.
- Ordinary authorized active-ride tracking is not stopped solely by this screen.

Document this as a prototype contract. The provided API specifies alert creation and safety-case access but does not establish a complete participant end-alert command. Do not invent a production endpoint or claim that integration is finished.

## Revised copy

Title:
- “End this SOS session?”

Supporting copy:
- “If you’re safe now, you can send a safe-status update and end this SOS session.”

Consequence summary:
- “Your ride will not be completed.”
- “Existing trip links remain active until revoked or expired.”
- “A safety case may remain open.”
- “Messages already sent cannot be recalled.”

Show “Manage sharing” when a relevant link is active so the user can separately choose revocation.

Actions:
- “I’m safe — end SOS”
- “Keep SOS active”

Do not automatically focus the confirming action.

Back/Escape/dismiss:
- Returns to the current dashboard.
- Keeps the SOS session and sharing state intact.

If the activation was accidental:
- Offer a concise optional reason.
- Do not require a written explanation.
- Do not erase evidence or withdraw unrelated reports.

## Pending and failure states

On confirm:
- Show “Sending safe-status update…”
- Prevent duplicate requests.
- Keep emergency calling available.

If offline:
- “Safe-status update saved on this device. Not confirmed.”
- Keep the pending condition visible.
- Do not immediately present a fully confirmed Ended state.

If the outcome is uncertain:
- Check the current authoritative/demo state before retrying.
- Do not automatically send duplicate updates.

If the update fails:
- Retain the session and explain the failure.
- Offer retry/check status and return to the dashboard.

## Why this change matters

The user can make a deliberate session choice without accidentally losing sharing, ending a ride, or assuming a safety case is closed.

# 11. Screen 7 — sos-ended

## Purpose

Provide a factual session summary and accessible follow-up.

## Correct the current safety assertion

Remove:
- “You’re safe.”

Use:
- Title: “SOS session ended”
- Supporting copy: “You marked yourself safe.”

Only show confirmed end-session copy after acknowledgement in the prototype contract. Pending local intents must remain visibly pending.

## Revised layout

### A. Factual status

Show:
- Session start and end times.
- Relevant alert or case reference when actually available.
- Current ride state.
- Sharing/link state.
- Current permitted safety-case status, if known.

If a reference is unavailable:
- Say so.
- Do not fabricate a production-looking case number outside labelled synthetic data.

If support has not acknowledged:
- Do not show “Support is handling your case.”
- Do not imply a response deadline.

### B. Session activity

Generate the summary from the same events used by the Active dashboard.

Include only actions that occurred or explicit simulated scenario events.

Do not automatically include:
- A contact notification.
- An SMS.
- A connected call.
- A successful location share.

A user who never called should not get a “Call placed” summary entry.

### C. Follow-up actions

Primary:
- “Back to ride” if the ride is still active.
- “View ride” or “Back to home” if the ride has closed.

Secondary:
- “Report an incident”
- “View safety case,” when available.
- “Manage sharing,” when a link remains active.

Keep emergency calling accessible if help is still needed.

Wire “Report an incident” to the existing report/support destination. Carry the ride reference and appropriate session context without exposing private information or automatically submitting a report.

If that destination is missing, implement the smallest connected report surface consistent with the existing Common flow. Do not leave a decorative button or build a new support system.

Returning to a ride must preserve the originating role.

If the ride closes while SOS is open:
- Display the updated ride state.
- Do not restore an obsolete “ride in progress” screen.
- Do not automatically close the safety case.

If the user needs SOS again:
- Allow an explicit new activation.
- Preserve the previous summary.
- Do not reopen an ended session as though it never ended.

## Why this change matters

The summary records known actions and the participant’s statement without asserting physical safety or pretending all follow-up has ended.

# 12. Shared state and navigation requirements

Keep session data outside the individual screen components so it survives:
- Active → Calling → Active.
- Active → Shared.
- Active → End confirmation → Keep active.
- Minimize → Reopen.
- Navigation to relevant contacts or reporting surfaces.

Use the existing App/shared ride scope. Do not introduce a global-store library.

Keep distinct values for:
- Originating role and ride.
- Local activation time.
- Alert submission status and reference.
- Contact notification status.
- Sharing-link status and expiry.
- Location source, timestamp, accuracy, and freshness.
- Safe-status/end-session intent.
- Permitted safety-case summary.
- Actual activity events.

Do not create an abstraction framework for this list; use the minimum straightforward state representation.

The elapsed timer must:
- Derive from timestamps.
- Continue across Calling, Shared, and confirmation states.
- Correct itself after backgrounding.
- Not reset when the sheet is reopened.
- Freeze at the acknowledged end time.
- Avoid duplicate interval-driven counters.

The current timer only ticks in Active/Shared; fix that root cause.

Opening SOS when a session already exists:
- Reopens that session.
- Does not reset to Confirm.
- Does not send a duplicate alert.

For duplicate protection:
- One completed hold produces one alert request.
- Repeated taps do not create duplicate alerts, links, reports, or safe-status updates.
- In the eventual production integration, use the documented idempotent command contract.
- Refresh/reconcile uncertain outcomes before retries.

For reload/reconnect:
- Restore a clearly labelled demo session in the prototype.
- Production status must be revalidated with the server.
- Never automatically resend an emergency action because a component mounted.

Keep ride closure separate:
- Live-location collection/access follows the authorized ride lifecycle.
- An open safety case may preserve existing evidence.
- It does not silently authorize new tracking after ride closure.

Use one consistent sharing implementation for:
- Passenger Share trip.
- Rider Share trip.
- SOS Share trip.

The screen picker should seed coherent synthetic scenario data and support both roles. It must not force every SOS review into Passenger mode or fabricate conflicting timestamps.

# 13. Required degraded and recovery states

Implement these as compact variants rather than adding a separate page for each:

| Condition | Required feedback and behavior |
|---|---|
| No internet before activation | Emergency numbers remain available. In-app alert is not shown as submitted. |
| Alert response uncertain | “Submission not confirmed”; offer check status before another request. |
| Alert submitted, contact notification failed | Keep submitted status; show notification failure separately. |
| Location stale | Last-known rider location and actual update time; no “Live” badge. |
| Location permission denied | Explain unavailable location without blocking emergency calling. |
| Ride not started | Tracking remains off; show the authorized meetup/ride context. |
| No selected contact | Explain unavailable contact notification; retain valid emergency actions. |
| Contact consent off | Do not notify; make optional consent management explicit. |
| Campus number unavailable | Explain it; retain 112 rather than inventing a number. |
| Share cancelled | Do not claim sent; show whether the created link remains active. |
| Clipboard unavailable | Offer selectable text; do not show copied success. |
| Link expired/revoked | Viewer loses access; explicit recreation only if allowed and requested. |
| Revoke outcome uncertain | Keep “not confirmed” visible until reconciled. |
| Safe-status update offline | Pending local intent, not confirmed Ended. |
| Authentication expired | Calls remain available; in-app commands require restored authorization. |
| Ride closes during SOS | Update ride/link/location state; preserve safety follow-up separately. |

Avoid endless spinners. When a result cannot be established, replace the spinner with an honest uncertain-status explanation and an appropriate next action.

Do not turn every network delay into a confirmed failure, and do not turn every user action into confirmed success.

# 14. Accessibility and responsive behavior

Verify:
- 360 × 800.
- 390 × 844.
- 430 × 932.
- A short-height viewport.
- 200% text scaling.
- Keyboard-open contact/report forms.
- Reduced motion.
- Keyboard-only interaction.
- Screen-reader navigation.

Requirements:
- No horizontal overflow.
- No clipped action labels.
- No emergency action hidden behind a home indicator or keyboard.
- Safe-area-aware padding.
- Scrollable content when text grows.
- Sufficient text and control contrast.
- Explicit accessible names for every icon-only action.
- Proper modal semantics, focus containment, and focus restoration.
- Inert/non-interactive background while a modal is open.
- Status announcements without reading the elapsed timer every second.
- Text alternatives for map/location information.

Do not make the fixed 390 × 844 phone frame the only supported layout.

If a drag handle is shown, either implement its behavior or remove the misleading affordance.

Closing or swiping a visible emergency surface must never silently end an active alert.

# 15. Connected journeys to verify

Build and test these complete paths through normal controls:

## Journey A — Passenger activates SOS

Passenger active ride
→ Open SOS
→ Complete hold
→ Pending submission
→ Submitted dashboard
→ Phone-app handoff
→ Return with timer/status intact
→ View sharing details
→ Confirm safe-status update
→ Ended summary
→ Return to the same ride.

## Journey B — Rider activates SOS

Rider active ride
→ Open SOS
→ Activate through accessible non-hold confirmation
→ Submitted dashboard
→ Call/contact handoff
→ Return
→ Minimize
→ Reopen existing session
→ Keep active from end confirmation.

The role must remain Rider throughout.

## Journey C — Accidental press

Open SOS
→ Hold briefly
→ Release early
→ Progress resets
→ No alert, contact message, or new link created.

Repeat using pointer cancellation, movement outside the control, and backgrounding during the unfinished hold.

## Journey D — Offline alert

Open SOS offline
→ Emergency number visible
→ Request alert
→ Not submitted/pending local state
→ Reconnect
→ Check/reconcile
→ One confirmed alert at most.

Do not create duplicate alerts during reconnect.

## Journey E — Partial success

Alert submitted
→ Contact notification fails
→ Emergency actions remain available
→ Retry only the failed action when supported
→ Timeline remains truthful.

## Journey F — Sharing cancellation and revocation

Create authorized link
→ Open share sheet
→ Cancel
→ No “sent” success
→ Inspect active-link status
→ Revoke
→ Viewer shows revoked state.

Also test offline revocation with an explicitly unconfirmed result.

## Journey G — Ending uncertainty

Open end confirmation
→ Choose Keep active
→ All state remains intact.

Then:
→ Request end while offline
→ Pending safe-status update
→ Reconnect/reconcile
→ Ended only after acknowledgement.

## Journey H — Ride closure and follow-up

Activate SOS
→ Ride closes through its separate lifecycle
→ SOS reflects current ride state
→ Sharing/location closure follows policy
→ Safety case can remain open
→ Ended summary opens the appropriate ride/report destination.

## Journey I — Missing data

Test:
- No emergency contact.
- Contact consent disabled.
- Campus number unavailable.
- Location denied.
- Stale location.
- Unsupported telephone/clipboard capability.

Every scenario must retain a useful next action.

# 16. Verification and delivery

After implementation:

1. Inspect the rendered screens at the required sizes.
2. Exercise the connected journeys, not only screen-picker previews.
3. Run the existing build script, such as \`pnpm build\` when pnpm is available.
4. Leave one minimal runnable regression check for continuous-hold cancellation and duplicate-activation protection. Use existing tooling or native facilities; do not install a testing framework solely for this.
5. Confirm that no ordinary-looking button is unwired.
6. Confirm that no hardcoded successful event appears when its action did not occur.
7. Confirm that timer, role, ride, contact, sharing, and alert state survive navigation.
8. Report only checks actually performed.

Provide a concise completion report covering:
- What changed in each of the seven SOS states.
- Which journeys were verified.
- Any remaining simulated integrations or unresolved product contracts.

Explicitly identify production dependencies where applicable:
- Authorized, idempotent emergency-alert submission.
- Trusted-contact consent and real dispatch/delivery information.
- A defined safe-status/end-session command.
- Server-enforced trip-link expiry and revocation.
- Real location freshness and background behavior.
- Configured campus contacts and actual support coverage.

Do not label these dependencies as implemented merely because their UI exists.

The finished result should feel calm, immediate, and trustworthy: emergency actions first, clear consequences, truthful status, accessible activation, and continuous context across every screen.