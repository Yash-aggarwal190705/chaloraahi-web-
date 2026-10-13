ROLE
You are a senior mobile UI/UX designer and motion designer working directly in Figma through the Figma MCP tools. You are editing an existing file, not starting a new one.

EXISTING FILE (read this first)
Figma file: [PASTE FIGMA FILE LINK HERE]
It contains pages "00 Onboarding", "01 Customer", "02 Rider", "03 Common", "04 SOS Flow", plus a shared design system (variables, text styles, components). Before making any changes:
1. Load the figma-use guidance (the /figma-use skill, or skill://figma/figma-use/SKILL.md), as the use_figma tool requires.
2. Call get_metadata on every page to get a full inventory of frames and layers.
3. Take screenshots of a few representative frames on each page to confirm the current state before editing.
4. Work page by page. After each page's edits, call get_screenshot on a sample of its frames and verify nothing broke (text not clipped, no leftover old name, layout intact).

PROJECT CONTEXT
The app's working name "CampusRide" is being replaced with the final name "SaathChalo" (Hindi for "walk/travel together" — written as one word, capital S and capital C, no space). This is a verified, closed-community ride-sharing app for daily commutes, starting with college students in Jaipur, India.

====================================================================
TASK A — RENAME "CampusRide" TO "SaathChalo" ACROSS THE ENTIRE FILE
====================================================================
Do this first, across every page, before touching the splash screen animation in Task B.

1. Update the Figma file's own title to "SaathChalo - MVP Screens".
2. Find every text layer across every page and frame that contains the literal string "CampusRide" (check exact case and also common variants like "Campus Ride" with a space, "campusride" lowercase, if any exist) and replace it with "SaathChalo". This includes but is not limited to:
   - The onboarding splash headlines and any logo/wordmark placeholder text layers
   - The top app bar / header area on Customer Home, Rider Home, and any other screen that shows a wordmark
   - The Welcome/Sign Up screen headline ("Welcome to CampusRide" -> "Welcome to SaathChalo")
   - The "About CampusRide" settings row on the Profile page -> "About SaathChalo"
   - Any footer, legal, or terms/privacy text that references the app by name
   - Any component's internal text (e.g. if a top-bar component has the wordmark baked in, edit the component itself once so every instance updates)
3. Update layer, frame, component and page names ONLY where they literally contain "CampusRide" as text (e.g. a layer named "CampusRide Wordmark" becomes "SaathChalo Wordmark"). Do not rename structural/functional layer names that just happen to be nearby (e.g. don't touch "Screen/Customer/Home/Idle").
4. Do not change colors, fonts, icons, or layout as part of this task — this is a text/naming pass only.
5. After the pass, do a final sweep: search every page's screenshots for any leftover visible instance of "CampusRide" and fix it before moving to Task B.

====================================================================
TASK B — ANIMATED SPLASH SCREEN
====================================================================
Redesign the existing 3-slide splash sequence on "00 Onboarding" (currently frames A1, A2, A3) into a richer, animation-ready sequence. Figma prototypes can't run custom code animation, so express the motion as a series of keyframe-style frames connected with Smart Animate — this also gives a Flutter/Lottie developer a clear reference for the real animation later.

DESIGN DIRECTION FOR THE SPLASH
- Keep using the existing color tokens and type styles — no new palette.
- Feel: warm, welcoming, a little playful, reflecting "SaathChalo" (togetherness) — but still clean and modern, not childish.
- The SaathChalo wordmark/logo should be the hero moment: it should feel like it assembles or reveals itself, not just appear.
- Motion should feel physical (ease-out, slight overshoot on the logo, staggered text reveals) rather than robotic or linear.

NEW/UPDATED COMPONENTS (Auto Layout, reuse existing tokens)
- Logo/SaathChalo-Wordmark (as an actual component, built from vector/text so it can be shown in multiple states: dot only, partial reveal, full reveal, settled)
- Illustration/TwoPeopleSharingRide, Illustration/FuelSplit, Illustration/SafetyShield (placeholder illustrations for slides 2-4, simple and on-brand, no real photos)
- Dots/PageIndicator (reuse the existing one if it exists)

SCREENS (still on page "00 Onboarding"; rename existing frames to Screen/Onboarding/Splash/<State> and ADD the new keyframe frames listed below — do not delete the existing informational content of the old A1-A3, fold it into this richer sequence)

SP0. Splash — Logo Reveal, Frame 1 (App Launch Icon state): plain background (Primary or Primary-light per token), just a small dot/mark in the center at low opacity/scale, representing the very start of the logo animation (frame 1 of a multi-frame Smart Animate sequence).
SP1. Splash — Logo Reveal, Frame 2: the dot/mark has grown and a partial outline of the SaathChalo wordmark is visible, still centered, no tagline yet.
SP2. Splash — Logo Reveal, Frame 3 (settled): full Logo/SaathChalo-Wordmark centered, settled at final size, with the tagline fading/sliding in just below it: "Chalo, saath chalein" (small, Caption or Body style, Text-secondary color).
SP3. Splash — Slide 1 (transition from SP2): logo shrinks and moves to a smaller top position, Illustration/TwoPeopleSharingRide slides/fades in below it, headline "Share your daily ride" and subtext "Verified students from your own college, going your way," Dots/PageIndicator (1 of 3), "Skip" top-right, "Next" primary button.
SP4. Splash — Slide 2: same layout pattern as SP3, Illustration/FuelSplit, headline "Only fuel cost, shared", subtext "No fares, no surge — just splitting the ride you're already taking," Dots/PageIndicator (2 of 3).
SP5. Splash — Slide 3: same layout pattern, Illustration/SafetyShield, headline "Safety comes first", subtext "ID verification, live trip sharing and an SOS button on every ride," Dots/PageIndicator (3 of 3), button becomes "Get Started".

Make sure the downstream frame that currently follows the old A3 (the Sign Up / Log In screen on this page, if present) still connects correctly from SP5.

PROTOTYPE (this is the key deliverable for Task B)
Wire SP0 -> SP1 -> SP2 automatically on load, no tap needed (use "After Delay" trigger, roughly 400-500ms between each, Smart Animate, ease-out; SP1 -> SP2 can use a slight "ease-out-back" style overshoot on the wordmark's scale if the easing options allow it, to give a gentle bounce-into-place feel). Then SP2 -> SP3 also "After Delay" (~800ms after settling), Smart Animate, ease-out, so the whole logo intro plays automatically before the user does anything. From SP3 onward, keep manual tap navigation (Next/Skip/Get Started) as before: SP3 -> SP4 -> SP5 -> (existing Sign Up frame, if present). Keep layer names for the wordmark, illustration, headline and subtext IDENTICAL across consecutive frames so Smart Animate interpolates position/scale/opacity smoothly instead of cross-fading unrelated layers.

HANDOFF NOTE FOR FLUTTER
Add a text note near the SP0-SP2 sequence in Figma (a simple sticky/comment or annotation frame) explaining: "This keyframe sequence is a reference for the real splash animation, intended to be built in Flutter using Rive or Lottie (exported from After Effects) rather than reproduced frame-by-frame in code. Approximate timing: dot appears at 0ms, wordmark assembles 0-500ms with a slight overshoot, tagline fades in 500-700ms, hold 700-1500ms, then transition into Slide 1."

RENAME CHECK FOR THIS PAGE
Confirm none of the new SP0-SP5 frames introduce "CampusRide" anywhere (they shouldn't, since they're new, but double check any copied/duplicated text).

FLUTTER-READY RULES
- Auto Layout everywhere except the logo mark itself, where absolute/vector positioning is expected.
- Every color and text style comes from existing shared variables/styles — no hard-coded values.
- Consistent layer names, no hidden or unused layers, no detached instances.
- Icons/illustrations are vectors exportable as SVG.

HANDOFF
When done, send me: the file link, confirmation that Task A's rename pass is complete with no remaining "CampusRide" instances found (or a list of any you couldn't safely change and why), links/node ids for the new SP0-SP5 frames, the list of any new components/variables added, and anything you had to approximate. Do not touch any screens beyond what's listed in Task A and Task B. Ask me first before doing anything else.