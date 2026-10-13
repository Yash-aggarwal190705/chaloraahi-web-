Refine the existing Wallet and Pricing screens for ChaloRaahi into a polished, accessible, fully connected mobile prototype.

Aim for a 10/10-quality experience across visual design, clarity, interaction, financial-state accuracy, accessibility, and consistency with the rest of the app.

Do not merely decorate the current screens. Correct the underlying interaction problems, replace unfinished content, and make every visible action work.

# 1. Project context and scope

ChaloRaahi is a verified, closed-community two-wheeler commute-sharing app.

Roles:
- Passenger: requests and joins a ride.
- Rider: shares an existing commute using their bike or scooter.

Use “Passenger” in user-facing copy, even if some existing internal variables still use “customer.”

Use ChaloRaahi consistently. If a different final brand has already been deliberately approved in this project, use that approved brand throughout.

Inspect the existing implementation first:
- src/WalletScreens.tsx
- src/PricingScreens.tsx
- src/CommonFlow.tsx
- src/App.tsx
- Relevant payment-summary and fuel-coverage sections in src/RiderFlow.tsx
- src/index.css
- package.json

If available, follow the product documents:
- docs/PRD.md
- docs/Domain-Model.md
- docs/API-SPEC.md
- docs/PRIVACY-RETENTION.md

Use the existing React, Vite, and Tailwind stack.

Reuse existing components and installed capabilities. Do not add a payment SDK, routing framework, global-state library, chart library, or new backend service merely to demonstrate these screens.

## Important product boundary

The current pilot uses direct cash or external UPI settlement between participants. Integrated wallets, withdrawals, and paid plans are future-feature concepts.

Retain and refine all the requested Wallet and Pricing screens as a clearly labelled future-feature prototype.

Use:
- Synthetic balances.
- Synthetic transaction references.
- Fictional bank accounts.
- Simulated payment outcomes.
- Clearly identified proposed plan benefits and billing policies.

Show a compact label such as:
“Concept demo · no real money moves”

Do not present this prototype as an operational financial service.

Do not connect live payment collection, payouts, bank verification, or recurring-payment mandates.

Do not automatically convert participant-reported cash/UPI settlement into wallet funds. External settlement and wallet movement are separate events.

# 2. Screens to preserve

Keep these existing Wallet identifiers:

1. wallet-home
2. wallet-add
3. wallet-history
4. wallet-rider-home
5. wallet-rider-history
6. wallet-withdraw
7. wallet-withdraw-bank
8. wallet-withdraw-pending
9. wallet-withdraw-success

Keep these Pricing identifiers:

10. pricing
11. pricing-selected
12. pricing-compare

Maintain compatibility with the screen picker.

Use shared components and compact variants for:
- Loading.
- Empty.
- Pending.
- Failed.
- Cancelled.
- Outcome unknown.
- Transaction details.
- Payment review.
- Payment result.

These do not each require a separate full-screen implementation.

# 3. Problems in the current implementation

Address these explicitly:

## Wallet

- Add Money immediately increases the balance without any payment confirmation.
- UPI and Card appear selectable but are not functional choices.
- Transaction history is static and never reflects new activity.
- Transaction categories are inferred only from positive/negative amounts.
- Amount input strips all non-digits, which can dangerously turn “12.50” into “1250.”
- Withdrawal review can silently substitute an amount instead of using the amount the user chose.
- Pending withdrawal can fall back to ₹200.
- Withdrawal confirmation immediately reduces the balance without a clear reservation/settlement model.
- Change bank and Add a different account are unwired.
- Pending withdrawal includes an internal demo control inside the phone UI.
- The “success” state says “Withdrawal requested,” which does not establish completion.
- Fuel coverage uses fixed values that conflict with other Rider screens.
- Some controls and supporting text are too small.
- Wallet screens can be opened with a role context that does not match their intended account.

## Pricing

- Plan descriptions and benefits are placeholders.
- “Most Popular” is shown without supporting evidence.
- Monthly/Yearly resembles a billing selector, but Yearly is only a disabled “Soon” control.
- Recommended and Selected treatments are too similar.
- Selected plan state is not robust across related navigation.
- Compare uses separate invented feature logic rather than the same data as plan cards.
- The comparison grid squeezes too much into narrow mobile columns.
- “Continue to Payment” has no behavior.
- “Change or cancel anytime” is an unsupported policy promise.
- Payment, activation, expiration, and renewal behavior are undefined.

Fix these root causes rather than placing superficial success banners over them.

# 4. Shared design system

Match the improved onboarding, Passenger, Rider, Profile/Common, and SOS visual language.

## Colors

- Primary: #3B5BDB
- Pressed primary: #2F49B5
- Main text: #101828
- Supporting text: #475467 / #667085
- Light neutral surfaces: #F7F8FA / #F9FAFB
- Borders: #E4E7EC
- Success: restrained green
- Pending: restrained amber
- Error: restrained red

Do not use red to imply that every ordinary outgoing payment is an error.

Use blue or neutral styling for routine spending. Reserve red for an actual failure or actionable problem.

## Typography

- Font: Inter.
- Screen titles: approximately 20–24 px.
- Main balance/price: approximately 32–36 px.
- Body and action text: 14–16 px.
- Supporting text: 13–14 px.
- Avoid tiny 9–11 px billing disclosures.

Use font weights actually available in the project. Load an additional weight only if necessary.

Use tabular numerals for balances, prices, and transaction amounts.

Format INR consistently using native Intl.NumberFormat:
- ₹120
- ₹1,200
- ₹12.50 when paise are meaningful.

Do not mix “Rs,” “₹,” and inconsistent decimal formatting across these screens.

## Layout

- Approximately 16–20 px horizontal padding.
- Consistent spacing based on the existing app.
- Rounded cards around 14–20 px.
- Restrained shadows.
- Clear separation between summary, actions, and activity.
- Sticky bottom actions only when they do not obscure content.

Use one visually dominant action per decision point.

Avoid:
- Giant decorative financial illustrations.
- Confetti.
- Sales countdowns.
- Animated money counters.
- Multiple competing filled buttons.
- Unnecessary gradients across every card.

A restrained primary-color balance card can remain, but it must be readable and information-first.

## Interaction

- Minimum 48 × 48 px actionable targets.
- Visible focus states.
- Clear pressed and pending states.
- Disabled controls accompanied by an understandable reason.
- Native accessible inputs and radio/select controls where appropriate.
- No normal-looking button without behavior.

# 5. Shared financial-state rules

These rules apply before styling individual screens.

## Use integer paise

Store monetary values as integer paise.

Do not perform balance arithmetic with floating-point rupees.

Parse user-entered decimal strings explicitly and validate them.

Accept:
- Valid positive amounts.
- At most two decimal places.
- Values within the configured product limits and safe numeric range.

Reject clearly:
- Negative values.
- Zero where payment requires a positive amount.
- Exponential notation.
- Infinity/NaN.
- More than two decimal places.
- Unexpected symbols or separators.
- Values above the available amount for withdrawals.

Do not silently reinterpret invalid input.

Examples:
- “12.50” must remain ₹12.50.
- “-200” must not become ₹200.
- “1e3” must not become ₹13.
- “200abc” must not become ₹200.

Trimming surrounding whitespace is fine.

Use inputMode="decimal" for amounts that support paise.

Remove the arbitrary five-digit truncation unless a real configured limit justifies it.

## One source of truth

Balance cards, the Wallet pill, recent activity, history, transaction details, pending totals, and status screens must all read the same underlying demo state.

Use stable transaction IDs.

A transaction record should include the minimum needed fields:
- ID/reference.
- Account/role.
- Type.
- Amount.
- Status.
- Creation/update timestamps.
- Payment method or payout destination.
- Related ride, payment, or plan reference when applicable.

Do not build a generic financial framework. A straightforward shared state model is sufficient.

## Distinguish transaction type from direction

Classify by explicit type:
- Top-up.
- Fuel contribution received.
- Fuel contribution paid.
- Withdrawal.
- Refund/reversal.
- Plan payment, only when actually paid from this wallet.

Do not treat every positive value as “Added” or every negative value as “Withdrawn.”

## Top-up rule

A top-up changes the wallet balance only after the simulated provider confirms success.

Opening a payment app, returning to the prototype, or pressing Pay does not prove success.

## Withdrawal rule

Use this simple, explicit demo model:

- Confirmed wallet balance: settled balance.
- Reserved for withdrawals: accepted withdrawal requests awaiting completion.
- Available balance: settled balance minus active reservations.

On accepted withdrawal:
- Reserve the amount once.
- Do not record a completed payout yet.

On completed withdrawal:
- Record the settled debit once.
- Release the matching reservation in the same update.

On confirmed failure:
- Release the reservation once.

On uncertain outcome:
- Preserve uncertainty.
- Check the existing request before allowing another submission.

Example:
- Settled balance: ₹240.
- Withdrawal accepted: ₹200.
- Reserved: ₹200.
- Available: ₹40.
- On payout completion: settled ₹40, reserved ₹0, available ₹40.
- On failure before payout: settled ₹240, reserved ₹0, available ₹240.

Do not double-deduct at both request and completion.

Do not invent a refund because a request merely failed before funds left the wallet.

## Duplicate protection

One user-confirmed action produces one transaction/request.

Prevent duplicates from:
- Repeated taps.
- Component remounts.
- Navigating back and forward.
- Reopening a pending transaction.
- Rechecking status.
- Replaying a demo outcome.

Production authorization, limits, idempotency, and settlement must eventually be server-enforced. The frontend simulation is not a production ledger.

# 6. Wallet screen 1 — wallet-home

## Purpose

Give the Passenger an immediate understanding of their demo wallet and recent activity.

## Revised layout

### A. Header

Title:
“Wallet”

Provide:
- Back to the actual originating screen.
- Compact concept-demo label.
- An accessible Help action if it connects to existing support.

### B. Balance card

Label:
“Available balance”

Show:
- Main amount.
- Pending top-ups separately, if any.
- A concise explanation of what this balance represents in the concept.

Primary action:
“Add money”

If balance is unavailable:
- Show an unavailable state.
- Do not substitute ₹0.

If loading:
- Use a restrained skeleton.
- Keep navigation available.

### C. Recent activity

Heading:
“Recent activity”

Action:
“View all”

Show the latest three to five actual demo records.

Each row:
- Transaction title.
- Method or ride context.
- Date/time.
- Amount.
- Status when not completed.

Make rows tappable to open transaction details.

Examples:
- “Wallet top-up”
- “Fuel contribution paid”
- “Top-up pending”
- “Payment reversed”

### D. Empty state

Copy:
“No wallet activity yet.”

Supporting copy:
“Your demo top-ups and wallet payments will appear here.”

Do not display fake transaction rows simply to fill space.

### E. Pending visibility

If a top-up is awaiting confirmation:
- Show it in recent activity.
- Provide “Check status.”
- Do not include it in available balance.

## Why this change matters

The home screen becomes a trustworthy summary rather than a static number above unrelated sample transactions.

# 7. Wallet screen 2 — wallet-add

## Purpose

Let the Passenger choose an amount and method, review it, and understand the outcome.

## Revised hierarchy

Title:
“Add money”

Context:
“Adding to Passenger wallet”

Show the current available balance as supporting information.

### A. Amount entry

Use a visible label:
“Amount”

Show a ₹ prefix.

Keep useful quick choices:
- ₹100.
- ₹200.
- ₹500.

Quick choices and manual entry must stay synchronized.

If the amount is edited manually, update the selected-chip state accurately.

Do not maintain separate conflicting values.

Show configured minimum/maximum limits only when supplied.

If using a synthetic limit for a test scenario, identify it as a demo setting.

### B. Payment method

Use actual selectable radio rows:
- UPI.
- Debit / credit card.

Each row needs:
- Clear label.
- Recognizable icon.
- Selected indicator.
- Accessible selected state.
- Availability explanation where needed.

The whole row should be actionable.

Use synthetic payment details only.

Do not collect:
- Real card numbers.
- CVV.
- UPI PIN.
- Bank login credentials.
- Real payment OTPs.

If Card is unavailable in the concept:
- Explain it.
- Do not leave a decorative selectable row.

### C. Review before submission

Show:
- Amount added.
- Any configured demo fee.
- Demo total to pay.
- Selected method.

A zero fee must be an explicit demo-fixture value, not an invented production promise.

Primary action:
“Continue with UPI”
or
“Continue with card”

Then show a compact review/handoff surface with:
“Pay ₹[total] · demo”

State clearly:
“No real payment will be made.”

### D. Result variants

Implement:
- Authorisation/handoff requested.
- Processing.
- Completed.
- Failed.
- Cancelled.
- Outcome not confirmed.

For success:
“₹200 added to your demo wallet.”

Show:
- Transaction reference.
- Amount.
- Method.
- Updated balance.
- “Back to Wallet”
- “View transaction”

For failure:
“Money was not added.”

For uncertain outcome:
“Payment confirmation unavailable.”

Offer:
“Check status”

Do not immediately invite another payment while the existing result is uncertain.

Returning from a UPI app or simulated handoff must not automatically create a successful top-up.

### E. Navigation

Back before submission:
- Preserve the draft amount while moving through review.
- Return to the correct wallet.

Back after submission:
- Leave the existing pending transaction intact.
- Reopen its status rather than submitting again.

## Why this change matters

The screen becomes a complete payment journey instead of a button that directly edits the balance.

# 8. Wallet screen 3 — wallet-history

## Purpose

Make Passenger wallet activity understandable and inspectable.

## Revised design

Title:
“Transactions”

Use date groups such as:
- Today.
- Yesterday.
- Earlier this month.

Derive them from actual timestamps in one consistent timezone, rather than storing arbitrary date labels in each row.

Keep practical type filters:
- All.
- Added.
- Paid.

Classify them by transaction type, not sign alone.

If refunds/reversals exist, label them explicitly rather than hiding them under an incorrect category.

A compact additional type selector is acceptable when necessary. Avoid a large filter drawer for this small prototype.

Preserve:
- Selected filter.
- Scroll position.
- Correct return destination.

## Transaction detail sheet

Tapping a row opens:
- Transaction title.
- Amount.
- Status.
- Reference.
- Created/updated time.
- Method.
- Related ride or plan, when available.
- Any relevant reversal relationship.

Actions:
- “Copy reference”
- “View ride,” when applicable.
- “Get help”

Copy-reference feedback must reflect actual clipboard success. Provide selectable text if clipboard access fails.

Do not manufacture a PDF receipt or tax invoice without the required data. A clear transaction-detail surface is enough.

## Empty and error states

No activity:
“No transactions yet.”

No matching activity:
“No transactions match this filter.”

Loading error:
“Couldn’t load transactions.”
Action:
“Try again”

Do not show an empty-state message for a loading failure.

## Why this change matters

The user can trace an amount to its actual status and context instead of seeing an unchanging list.

# 9. Wallet screen 4 — wallet-rider-home

## Purpose

Distinguish withdrawable wallet funds from contribution statistics.

## Revised hierarchy

Title:
“Wallet”

Context:
“Rider wallet · concept demo”

### A. Available funds

Main card:
“Available to withdraw”

Show:
- Available amount.
- Reserved withdrawal amount when present.
- Settled balance in supporting detail if needed.

Primary action:
“Withdraw”

If available balance is zero:
- Explain why.
- Disable withdrawal appropriately.
- Do not imply a positive pending amount is withdrawable.

### B. Remove competing Add Money action

The default Rider concept is receiving fuel contributions and withdrawing settled funds.

Remove the competing “+ Add Money” action from this hero unless an approved specification defines a clear Rider top-up purpose.

Keep wallet-add available for its Passenger journey.

Do not automatically move funds between Passenger and Rider balances.

### C. Pending withdrawals

When a withdrawal exists:
- Show amount.
- Destination suffix.
- Current status.
- Request time.
- “View withdrawal”

This must remain visible after returning from the pending screen.

### D. Fuel contribution overview

Replace the static progress values with a derived summary.

Preferred wording:
“Fuel contributions received this week”

Count only relevant completed contribution records.

Exclude:
- Top-ups.
- Withdrawals.
- Refunds unrelated to contributions.
- Subscription payments.
- Pending receipts.

If cash/external UPI amounts are included:
- Separate them as participant-reported.
- Label them “Reported received · not bank-verified.”
- Do not add them to wallet balance.

If there is no configured weekly fuel-cost estimate:
- Show the contribution total without a progress target.

If an estimate exists:
- Show its source and period.
- Clamp visual progress to 100%.
- Do not describe money above the estimate as profit.

Use the same underlying values as the Rider home and ride-summary surfaces where they show this statistic.

Remove contradictory hardcoded ₹240/₹400/₹300 targets.

### E. Recent activity

Show relevant real demo records with:
- Contribution receipt.
- Withdrawal request.
- Completed withdrawal.
- Released reservation or reversal, where applicable.

## Why this change matters

Available money, pending payout requests, and fuel-cost statistics become distinct and internally consistent.

# 10. Wallet screen 5 — wallet-rider-history

Reuse the Passenger history component with Rider-specific data and filters.

Title:
“Transactions”

Filters:
- All.
- Received.
- Withdrawals.

Use explicit types:
- Received means eligible contribution credits.
- Withdrawals includes requested, pending, completed, and failed withdrawals with accurate status.

Do not classify a refund as a new fuel contribution merely because it is positive.

Show:
- Date groups.
- Stable references.
- Destination suffix for withdrawals.
- Ride context for contributions.
- Clear pending/failed states.

Tapping a pending withdrawal must reopen the same request.

Tapping a completed withdrawal must open its completed detail, not create a fresh success screen with a default amount.

Detail copy should distinguish:
- “Request received”
- “Processing”
- “Transfer completed”
- “Failed”
- “Outcome not confirmed”

“Completed” must correspond to the defined simulated provider event, not elapsed time.

## Why this change matters

The Rider can track a particular request without confusing it with a new withdrawal or an ordinary contribution.

# 11. Wallet screen 6 — wallet-withdraw

## Purpose

Choose a valid amount from funds actually available.

## Revised layout

Title:
“Withdraw”

Show:
“Available to withdraw”
₹[available]

If funds are reserved:
“₹[reserved] is reserved for pending withdrawals.”

### A. Amount entry

Label:
“Withdrawal amount”

Use the shared validated amount input.

Quick actions:
- ₹200, if appropriate.
- ₹500, if appropriate.
- “All available”

Preset amounts above the available amount:
- Must not look like valid choices.
- Disable with an understandable explanation, or omit them when they add no value.

“All available” uses available funds after reservations, not the gross settled balance.

Do not imply that ₹200 is a minimum simply because it is a preset.

### B. Validation

Examples:
- “Enter an amount greater than ₹0.”
- “You can withdraw up to ₹[available].”
- “Use no more than two decimal places.”

Show errors near the input.

Preserve the typed amount so the user can correct it.

### C. Action

Primary:
“Continue”

Supporting copy:
“You’ll review the destination before submitting.”

Do not reserve or deduct money on Continue.

### D. Revalidation

When the available amount changes before confirmation:
- Revalidate.
- Explain the change.
- Ask the user to adjust if necessary.

Do not silently reduce their requested amount.

## Why this change matters

The request amount remains explicit and valid throughout the flow.

# 12. Wallet screen 7 — wallet-withdraw-bank

## Purpose

Review the exact amount and payout destination before submission.

## Remove silent defaults

Never substitute ₹200 or another amount if the draft is missing or invalid.

If the user reaches this state without a valid draft:
- Explain that an amount is needed.
- Return them to amount entry.
- Do not enable submission with a fabricated amount.

The screen picker may supply an explicit synthetic fixture for review, but ordinary navigation must use the actual draft.

## Revised layout

Title:
“Review withdrawal”

### A. Summary

Show:
- Requested amount.
- Configured demo fee, if any.
- Amount sent to the bank.
- Available amount after reservation.
- Destination.

Make the total/destination easy to scan.

Do not promise a real payout time without a configured provider policy.

### B. Bank destination card

Show:
- Fictional bank name.
- Masked account number.
- Account-holder name.
- Explicit demo status.

Example:
“Demo Bank”
“Account ending 4821”
“Sample account holder”

Do not call an account “Verified” merely because the entered fields have a valid format.

### C. Change destination

Wire:
“Change”

Open a compact account-selection sheet using synthetic saved accounts.

Selecting an account must update:
- Review card.
- Submission snapshot.
- Pending state.
- Transaction detail.
- Final result.

### D. Add account

Wire:
“Add another account”

Use the smallest useful sheet consistent with existing form styling.

Use fictional example data only.

If demonstrating fields:
- Account-holder name.
- Account number.
- Confirm account number.
- Bank routing code/IFSC.

Validate:
- Required fields.
- Matching account-number entries.
- Supported field formats.

Explain that format validation is not real bank verification.

Store only the masked synthetic account projection after saving. Do not persist real bank details in browser storage.

Do not add a KYC workflow to this design task.

### E. Submission

Primary:
“Request withdrawal · ₹[amount]”

On press:
- Revalidate the draft and available amount.
- Snapshot amount and destination.
- Disable duplicate submission.
- Show “Submitting request…”

On accepted request:
- Create one withdrawal record.
- Reserve the amount once.
- Navigate to the pending state.

On uncertain submission:
- Show uncertainty.
- Check the existing request before creating another.

## Why this change matters

The user confirms the exact destination and amount, and the prototype stops relying on unwired controls and hidden fallback values.

# 13. Wallet screen 8 — wallet-withdraw-pending

## Purpose

Show that a request exists without claiming money has reached the bank.

## Revised content

Title:
“Withdrawal requested”
or
“Withdrawal processing”

Choose the title based on the actual demo state.

Supporting copy:
“Your request is pending. The transfer is not confirmed yet.”

Show:
- Exact amount.
- Destination suffix.
- Request reference.
- Request time.
- Current status.
- Reserved amount.
- Available balance.

If a processing estimate is supplied:
- Display it as an estimate.
- Identify business-day/timezone semantics where necessary.

Remove the unconditional “1–2 business days” promise unless it is a configured, explicitly labelled demo policy.

### Actions

Primary:
“Back to Wallet”

Secondary:
“View transaction”

When supported:
“Check status”

Support:
“Get help”

Returning to Wallet must preserve the request and its reservation.

Reopening it must show the same request ID and destination.

### Demo controls

Move:
“Demo: simulate request confirmed”

outside the phone frame.

External scenario controls may simulate:
- Accepted.
- Processing.
- Completed.
- Failed.
- Outcome unknown.

Do not automatically turn Pending into Success after a timer.

### Failure and uncertainty

Failure:
“Withdrawal failed.”

Explain the reservation release only after it actually occurs.

Uncertain:
“Transfer status not confirmed.”

Do not release funds merely because a network check timed out.

Do not allow another withdrawal of reserved funds until the request is reconciled.

## Why this change matters

Request acceptance, payout processing, and actual completion are represented as different states.

# 14. Wallet screen 9 — wallet-withdraw-success

## Purpose

Confirm a genuinely completed simulated payout.

## Correct the current copy

The current identifier suggests success, but the screen says “Withdrawal requested.”

Use this state only for a completed transfer.

Title:
“Withdrawal completed”

Supporting copy:
“₹[amount] was transferred to your demo account ending [suffix].”

Show:
- Completed amount.
- Destination.
- Request/transaction reference.
- Completion timestamp.
- Updated available balance.

Actions:
- “Back to Wallet”
- “View transaction”

A restrained success icon is enough. No confetti or reward-like treatment.

Use the actual request data. Do not:
- Fall back to ₹200.
- Deduct the amount again.
- Default to account ending 4821 after the destination was changed.
- Treat any unmatched screen value as a successful withdrawal.

Handle screen states explicitly rather than using a generic success return for everything else.

For direct screen-picker review:
- Seed a coherent completed synthetic transaction.
- Do not execute a financial transition merely because the screen mounted.

## Why this change matters

A success screen should establish completion with a traceable record, not merely restate that someone clicked Request.

# 15. Pricing content and proposed plan policy

Replace “Feature placeholder” and “Placeholder plan description.”

First look for approved plan content in the project.

If approved content is missing, use the following explicitly labelled concept catalog. These are proposals for prototype evaluation, not established product entitlements.

Preserve the current sample price points:
- Basic: ₹99 per month.
- Plus: ₹199 per month.
- Pro: ₹299 per month.

Use this proposed content:

## Basic

Description:
“For a simple, organised commute routine.”

Proposed benefits:
- Up to 3 saved commute templates.
- Weekly personal commute overview.

## Plus

Description:
“For regular commuters who want more planning tools.”

Proposed benefits:
- Up to 10 saved commute templates.
- Weekly and monthly personal commute overviews.
- Calendar-file export for scheduled rides.

## Pro

Description:
“For commuters who want detailed personal records.”

Proposed benefits:
- Up to 25 saved commute templates.
- Weekly and monthly personal commute overviews.
- Calendar-file export for scheduled rides.
- Downloadable personal monthly commute summary.

Keep these benefits in one shared data source.

Do not implement the proposed convenience features as part of this Wallet/Pricing task. Clearly identify them as proposed benefits.

Do not put any of these behind a paid tier:
- SOS.
- Emergency contacts.
- Report/block.
- Identity verification.
- Required privacy protections.
- Basic eligible ride booking.
- Essential ride-status information.

Do not claim:
- Guaranteed rides.
- Priority emergency response.
- Guaranteed matching.
- Unlimited availability.
- Higher Rider income.
- Insurance coverage.
- Guaranteed savings.

## Default demo billing contract

Use one explicit, simple proposed contract:
- A one-month access period.
- One demo payment.
- Manual renewal.
- No automatic recurring charge.

Display:
“Billed once for one month · manual renewal in this demo.”

This replaces the unsupported “change or cancel anytime” promise.

Use fixture/configuration start and expiry timestamps. Do not assume every month has 30 days.

Do not invent annual discounts, refund guarantees, or tax treatment.

# 16. Pricing screen 1 — pricing

## Purpose

Explain optional plans clearly and make comparison easy.

## Revised hierarchy

### A. Header

Title:
“Plans”

Back:
Returns to the actual originating Profile/Common screen and role.

### B. Introduction

Headline:
“Choose how you organise your commute”

Supporting copy:
“Optional planning tools. Fuel contributions are separate.”

Add a compact:
“Proposed plans · concept demo”

Clarify:
“Core ride and safety features do not require a paid plan.”

This should be readable supporting copy, not hidden small print.

### C. Billing presentation

Since only monthly pricing exists:
- Replace the disabled Monthly/Yearly toggle with a simple “Monthly plans” label.
- Remove the speculative “Yearly · Soon” control.

If approved annual pricing is supplied later, a real accessible billing selector can be added using actual totals and terms.

Do not fabricate annual savings to make the page appear more complete.

### D. Plan cards

Each card contains:
- Plan name.
- One-sentence description.
- Price and billing period.
- Proposed benefits.
- Selection action.

Use:
“Select Basic”
“Select Plus”
“Select Pro”

A plan card is not itself a purchase confirmation.

Use one consistent selection model:
- No plan is selected automatically in the normal entry state.
- The user explicitly chooses.
- A direct review fixture can seed a selected plan.

### E. Remove unsupported popularity claims

Remove:
“Most Popular”

Do not replace it with another unproven adoption claim.

If highlighting Plus for concept evaluation:
- Use a neutral “Suggested for regular commuters” label.
- Keep it visually different from “Selected.”
- Identify this as editorial guidance, not measured popularity.

### F. Comparison action

Place:
“Compare plans”

near the introduction or first decision area, rather than making the user scroll past every card before discovering it.

### G. Brief FAQs

Use short expandable answers:
- Are fuel contributions included?
- Do I need a paid plan to book a ride?
- Does this demo renew automatically?
- When does plan access end?

Answers must follow the proposed demo contract.

Do not add vague “all inclusive” language.

## Why this change matters

The user sees what differs, what remains available without payment, and what the billing period actually means.

# 17. Pricing screen 2 — pricing-selected

## Purpose

Confirm the user’s choice and move to a working review/checkout flow.

Reuse the same pricing content and cards.

## Selected treatment

Use:
- Stronger primary border.
- “Selected” label.
- Accessible radio/selection state.
- A restrained check icon.

Do not use the same styling for:
- Suggested.
- Selected.
- Current active plan.

These are three different concepts.

## Sticky summary

Show:
- Selected plan.
- Demo total.
- One-month access.
- Manual-renewal statement.

Primary:
“Review [plan]”

Prefer this over an unexplained “Continue to Payment.”

The footer must remain readable at large text sizes and must not overlap the last plan card or FAQ content.

Selecting another plan updates:
- Card.
- Footer.
- Review sheet.
- Demo total.

## Payment review sheet

Wire the primary action to a real compact review surface.

Show:
- Selected plan.
- Proposed included benefits.
- Access duration.
- Payment method.
- Demo total due.
- Start/expiry behavior.
- “No real charge” statement.

Use the same payment-method component and result handling as Add Money where practical.

Do not invent GST rates or claim tax exemption.

The existing ₹99/₹199/₹299 values can be shown as final demo totals for the synthetic scenario, clearly distinct from a real production quote.

A real payable total requires approved fee/tax configuration before live collection.

Primary:
“Pay ₹[demo total] · demo”

Secondary:
“Back to plans”

## Payment outcomes

Support:
- Processing.
- Completed.
- Failed.
- Cancelled.
- Confirmation unavailable.

Activate the demo plan only after a completed simulated payment.

On success:
“[Plan] activated in this demo”

Show:
- Plan.
- Paid demo amount.
- Payment reference.
- Access start.
- Access expiry.
- “Manual renewal · no automatic charge.”

Actions:
- “View plan”
- “Back to Profile”

On pending:
“Payment confirmation pending.”

Do not claim benefits are active yet.

On failure/cancellation:
- Keep the selected plan.
- Keep the prior active plan, if any.
- Allow a deliberate retry only after the old attempt is resolved.

On uncertain outcome:
- “Check payment status”
- Avoid a second payment attempt until reconciled.

## Active plan presentation

Once activated:
- Show “Current plan” based on confirmed demo entitlement.
- Keep it distinct from a merely selected option.
- Expose “View current plan” with period and receipt details.

Do not automatically buy a second subscription when the user revisits this screen.

For changing tiers without an approved upgrade/proration policy:
- Allow comparison.
- Explain that a change policy is not configured.
- Do not charge an arbitrary difference or erase the existing access period.

## Why this change matters

Selecting a plan becomes a deliberate, traceable journey rather than a visual state above a dead payment button.

# 18. Pricing screen 3 — pricing-compare

## Purpose

Compare meaningful differences without forcing tiny mobile text.

## Use shared plan data

Generate the comparison from the same catalog used by the cards.

Remove the separate placeholder-row logic.

Changing a benefit or price in one place must update:
- Plan cards.
- Comparison.
- Selected summary.
- Checkout review.

## Mobile comparison layout

Do not squeeze a feature label plus three plan columns into a narrow four-column grid.

For phone widths, use feature-by-feature groups:

Feature heading:
“Saved commute templates”

Three clearly labelled values:
- Basic: 3.
- Plus: 10.
- Pro: 25.

Next feature:
“Monthly commute overview”
- Basic: Not included.
- Plus: Included.
- Pro: Included.

Continue with the same proposed catalog.

Use visible plan names alongside values.

A checkmark alone is insufficient for accessibility.

Use:
“Included”
“Not included”
or
the actual numeric limit.

Do not use a faint unexplained dash.

On wider layouts, a semantic table is acceptable if it remains readable.

## Common features

Group features shared across plans once rather than repeating identical rows excessively.

Keep the essential free/core capabilities separate from paid convenience comparisons.

## Selection

Make plan selection possible from comparison:
- “Select Basic”
- “Select Plus”
- “Select Pro”

Selecting returns to or updates the selected-plan state.

Preserve:
- Selection.
- Previous pricing context.
- Appropriate scroll position.

Back must not discard a previously selected plan or reset everything to Plus.

## Why this change matters

The comparison becomes useful on a real phone, with actual distinctions and a direct next action.

# 19. Wallet, Pricing, and Common-flow integration

## Preserve origin

Track whether the user opened these screens from:
- Passenger home Wallet pill.
- Rider home Wallet pill.
- Profile.
- Transaction detail.
- Plan detail.
- External screen picker.

Back returns to the correct origin.

Do not always return Wallet to Home if it was opened from Profile.

Do not switch Rider to Passenger when leaving Common screens.

## Shared state survives navigation

Keep financial and plan demo state in the existing App/shared scope so it survives:
- Wallet home → Add money → Payment result.
- Wallet home → History → Detail.
- Rider wallet → Withdrawal → Pending → Wallet → Reopen request.
- Pricing → Compare → Selected → Review.
- Payment result → Profile → Plans.

Do not leave important drafts or completed records exclusively inside components that unmount during these paths.

## Role/account correctness

Keep Passenger and Rider demo accounts explicitly separated.

Do not:
- Credit the wrong role because a screen was opened through the picker.
- Withdraw from Passenger funds through a Rider screen.
- Automatically transfer money between role balances.
- Charge a plan separately for each role unless that is an approved product rule.

Treat the proposed plan as belonging to the signed-in member, not automatically as two independent subscriptions.

## Payment-method correctness

If a plan is paid through a simulated external UPI/card method:
- Record its billing payment.
- Do not deduct wallet funds.

Only show a wallet debit if the user actually selected a supported wallet-payment method.

Do not add Wallet as a subscription payment option merely because both features exist.

## External settlement boundary

A Rider marking cash or external UPI as received:
- Creates a participant-reported settlement record.
- Does not establish bank-verified payment.
- Does not create withdrawable wallet funds.

Keep:
- Ride completion.
- Settlement reporting.
- Wallet settlement.
- Subscription access.

separate.

## Consistent fixtures

Seed coherent sample data.

Balances must reconcile with the ledger and any explicit opening balance.

A truncated Recent activity list does not need to sum to the full balance, but the full demo ledger must be consistent.

Use an explicit opening balance when representing older history. Do not hide unexplained balance adjustments.

Direct screen-picker previews must:
- Seed the correct role.
- Seed the intended transaction/plan state.
- Use coherent timestamps and references.
- Never execute a payment or withdrawal on mount.

Keep all scenario switches outside the phone frame.

# 20. Required recovery and edge states

Implement these as concise variants:

| Scenario | Required behavior |
|---|---|
| Balance loading | Skeleton; no fabricated ₹0. |
| Balance unavailable | Clear unavailable state and retry. |
| No transactions | Honest empty state. |
| Filter has no results | Explain filter result separately from loading failure. |
| Invalid decimal input | Preserve value and explain error; no digit-stripping reinterpretation. |
| Withdrawal above available amount | Show maximum available and block submission. |
| Available funds change during review | Revalidate and ask for correction. |
| Payment handoff cancelled | No balance credit or plan activation. |
| Payment response uncertain | Check existing attempt before retrying. |
| Duplicate taps | One request and one ledger effect. |
| Pending withdrawal reopened | Same request, amount, destination, and reservation. |
| Withdrawal fails | Release its reservation exactly once after confirmed failure. |
| Payout result unknown | Do not falsely release or settle funds. |
| Invalid/missing withdrawal draft | Return to amount entry; no fallback ₹200. |
| Destination unavailable | Require a valid demo destination before submission. |
| Clipboard denied | Selectable reference text; no fake copied toast. |
| Plan payment pending | Selected plan retained; entitlement unchanged. |
| Plan payment failed | Prior entitlement preserved. |
| Plan expires | Current-plan status changes; no automatic charge. |
| Authentication expires | Preserve request context; require authorization before another command. |
| Reload/reconnect | Restore labelled demo state and reconcile uncertain operations. |

Do not use a timeout to manufacture a successful result.

Do not interpret every network error as proof that no money moved.

# 21. Accessibility and responsive requirements

Inspect:
- 360 × 800.
- 390 × 844.
- 430 × 932.
- A short viewport.
- Keyboard-open forms.
- 200% text scaling.
- Keyboard-only use.
- Screen-reader navigation.
- Reduced motion.

Requirements:
- No clipped amounts.
- No horizontal page overflow.
- No tiny billing disclosures.
- No sticky footer covering content.
- Safe-area-aware bottom spacing.
- Inputs and error messages remain visible above the keyboard.
- Buttons may grow vertically when text wraps.
- Radio groups expose selection correctly.
- Transaction rows have descriptive accessible names.
- Modal sheets contain focus and restore it on close.
- Background controls are inactive while a modal is open.
- Status changes are announced without excessive repetition.
- Color is supplemented with text/status icons.
- Disabled buttons remain visually readable.
- Balance changes do not rely on animation.

Expand the interactive target of the Wallet pill and back buttons to at least 48 px.

At narrow widths, adjust the crowded top-bar layout rather than shrinking the balance text until it becomes unreadable.

# 22. Connected journeys to verify

## Journey A — Successful Passenger top-up

Passenger home
→ Wallet
→ Add money
→ Enter ₹200
→ Choose UPI
→ Review
→ Simulated processing
→ Simulated success
→ Wallet balance increases once
→ New transaction appears in Recent activity and History
→ Open transaction detail.

## Journey B — Cancelled/uncertain top-up

Add money
→ Review
→ Cancel handoff
→ No balance credit.

Then:
→ Submit a new deliberate attempt
→ Outcome uncertain
→ Check existing status
→ Confirm once
→ One transaction effect.

## Journey C — Amount validation

Test:
- Blank.
- Zero.
- Negative amount.
- ₹12.50 as plain decimal input.
- More than two decimals.
- Letters.
- Exponential notation.
- Over-limit amount.
- Withdrawal above available balance.

No value may be silently transformed into a different monetary amount.

## Journey D — Rider withdrawal completed

Rider home
→ Rider Wallet
→ Withdraw ₹200 from ₹240 available
→ Choose demo bank
→ Review
→ Request accepted
→ Available ₹40, reserved ₹200
→ Return to Wallet
→ Reopen same pending request
→ Simulate provider completion
→ Available ₹40, reserved ₹0
→ One completed debit in History.

## Journey E — Rider withdrawal failed

Request accepted
→ Reservation visible
→ Simulate confirmed failure
→ Reservation released once
→ Available balance restored
→ Failure remains visible in the transaction record.

## Journey F — Destination change

Enter amount
→ Review destination
→ Change bank
→ Confirm different synthetic account
→ Submit
→ Pending and success show that same account suffix.

## Journey G — Pricing selection and comparison

Profile
→ Plans
→ Select Basic
→ Compare
→ Inspect all proposed limits
→ Select Pro
→ Return to selected state
→ Summary and review show Pro with the correct amount.

## Journey H — Demo plan activation

Select Plus
→ Review
→ Choose method
→ Simulated payment pending
→ Entitlement remains inactive
→ Simulated confirmation
→ Demo Plus access activated once
→ View period and payment reference
→ Return to Profile
→ Reopen Plans
→ Current plan still accurate.

## Journey I — Failed plan payment

Select a plan
→ Payment fails/cancels
→ Selection remains
→ No new active entitlement
→ Existing plan, if any, remains intact.

## Journey J — Context preservation

Test Wallet and Plans from both Passenger and Rider contexts.

Back navigation must retain:
- Role.
- Origin screen.
- Ride/booking context.
- Transactions.
- Pending requests.
- Plan selection and confirmed demo access.

# 23. Verification and implementation discipline

Use the smallest coherent change that completes these journeys.

Prefer:
- Existing components.
- Native Intl formatting.
- Native accessible inputs.
- Shared straightforward state.
- Compact review/detail sheets.

Avoid:
- Separate pages for every small status.
- New backend scaffolding.
- Custom financial infrastructure.
- Decorative charts without meaningful data.
- Implementing proposed paid convenience features during this task.

Run the existing build command, such as `pnpm build` when pnpm is available.

Leave one minimal runnable regression check using existing tooling or native facilities for:
- Correct parsing of decimal amounts.
- Exactly-once top-up credit.
- Withdrawal reservation/completion/failure accounting.
- No entitlement activation before payment confirmation.

The check must catch real financial-state regressions. Do not install a testing framework solely for this prototype.

Inspect the rendered screens and exercise normal navigation. A screen-picker preview alone does not prove that the journey works.

# 24. Acceptance criteria for a 10/10-quality target

The result is ready for a high score only when:

## Visual hierarchy — 2 points
- Balance, total, status, and next action are immediately clear.
- Wallet and Pricing fit the established app.
- Typography and spacing remain readable on real phone widths.

## Financial and billing clarity — 2 points
- Pending, available, reserved, completed, failed, and unknown states are accurate.
- Charges and access periods are explicit.
- No misleading provider, tax, settlement, popularity, or policy claims remain.

## Interaction completeness — 2 points
- Every visible action works.
- Selection, review, submission, result, history, detail, and return journeys are connected.
- Duplicate actions do not duplicate effects.

## Accessibility — 1 point
- Keyboard, screen reader, enlarged text, contrast, and touch targets pass.

## Recovery states — 1 point
- Offline, uncertain, cancelled, failed, missing-data, and zero-balance conditions remain usable.

## Cross-screen consistency — 1 point
- Balances, transactions, destinations, plan data, and role context agree everywhere.

## Prototype honesty — 1 point
- Future-feature concepts, sample policies, synthetic accounts, and simulated outcomes are clearly identified.
- No real financial service is implied.

Do not claim a 10/10 merely because the implementation compiles.

If rendered inspection or a required journey cannot be completed, state that explicitly and leave the score provisional.

# 25. Completion report

After implementing, provide:

1. A short screen-by-screen summary for all nine Wallet and three Pricing states.
2. The connected journeys actually verified.
3. Build/regression-check results actually obtained.
4. Any remaining simulated integrations or unresolved product rules.

Clearly identify the eventual production dependencies:
- Authoritative wallet accounting.
- Payment-provider confirmation.
- Payout destination verification and payout status.
- Server-enforced limits and duplicate protection.
- Approved subscription benefits and billing terms.
- Approved taxes/fees and real receipt data.

Do not describe these as implemented simply because corresponding UI exists.

The finished screens should feel calm, clear, and dependable: understandable money states, deliberate decisions, meaningful plan differences, complete interactions, and consistent context.
▣  Plan · GPT 6 Astra · 8m 59s