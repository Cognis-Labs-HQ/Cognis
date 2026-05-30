# Ignored Automated Feedback

## Code Review — PR #45 third-pass (2026-05-29)

### settings-section.js drag-drop handler — mutation before rerender

**Reviewer suggestion:** Remove the `pendingPreferredIds.filter(...)` mutation at lines 461-463 because "the deactivation toast logic starting at line 466 already handles building the correct method list and the `rerender()` call will reflect the updated state."

**Reason ignored:** The suggestion is based on a misreading of the code. The `allMethods` list built at line 466 is used only to look up the display name for the toast; it does not update `pendingPreferredIds`. Removing the filter mutation would mean `pendingPreferredIds` still contains the deactivated method after the drag, causing `rerender()` to show an incorrect UI state where the method appears as preferred even though it was dragged to the available table.

### gateway.ts TfaAdapterFactory JSDoc — suggested `*/` relocation

**Reviewer suggestion:** Move the closing `*/` of the JSDoc block to after the type definition so the type itself is inside the documentation block.

**Reason ignored:** JSDoc syntax requires the `*/` to precede the declaration it documents — placing it after `TfaAdapterFactory`'s closing `) => TfaMethodAdapter;` would include the type syntax inside the comment string, making the declaration invisible to the TypeScript compiler.

## Code Review — SMTP TFA resend layout and rate-limit visibility

### login-flow.js rate-limit toast — extract into separate function

**Reviewer suggestion:** Extract the rate-limit toast display logic from inside `updateCountdown` into a separate function (e.g. `showRateLimitNoticeOnce`) that manages its own state.

**Reason ignored:** The toast fires exactly once per `switchToTfaPrompt` invocation and is tightly coupled to `rateLimitNoticeShownOnce` and `remainingSeconds` — both local closure variables. Extracting it would require passing or closing over those variables anyway, adding a named function for a single callsite with no meaningful readability or testability gain.

## Code Review — SMTP TFA toast feedback follow-up

### smtp-notification-sender.ts import ordering — verification builder before registration builder

**Reviewer suggestion:** Reorder the `smtp-message-builders.js` imports so `buildVerificationEmailMessage` appears before `buildRegistrationInviteEmailMessage`, matching their usage order in `smtp-notification-sender.ts`.

**Reason ignored:** This is a readability-only change in `src/adapters/notify/smtp/`, a component unrelated to the current TFA toast fix. Under the repository versioning rules, touching that adapter would require an additional notify-adapter version bump and changelog update unrelated to the user-visible bug being fixed here, so I left it unchanged to avoid unrelated component churn.

### login/index.js TFA client loading — add rejected-promise handling

**Reviewer suggestion:** Add `.catch()` or equivalent error handling around `loadTfaLoginClient().then(...)` in `src/ui/app/login/index.js` so failures are not silently swallowed.

**Reason ignored:** This is a broader login-page resilience change outside the SMTP resend-toast bug being fixed here. Addressing it properly would require touching the shared login flow, validating the wider auth UI behavior, and likely bumping the core UI changelog surface as a separate task rather than folding it into this targeted TFA UX correction.

### adapters/tfa/smtp/index.ts retry metadata helper — rename for brevity

**Reviewer suggestion:** Rename `resolveRetryMetadataFromAvailableAt` to a shorter helper name such as `parseRetryMetadata` or `extractRetryMetadata`.

**Reason ignored:** This is a naming-only refactor in the SMTP TFA adapter with no effect on the user-visible toast regression. Changing it would widen the patch into an unrelated adapter refactor and force extra component-version bookkeeping without improving correctness for the issue under review.

### smtp-notification-sender.ts queued verification validation — guard missing notification IDs

**Reviewer suggestion:** Validate the queued verification result before calling `waitForResult` so a missing `notificationId` produces a clearer error in `src/adapters/notify/smtp/smtp-notification-sender.ts`.

**Reason ignored:** The current task is confined to the TFA login UI toast feedback. A notify-adapter validation change belongs in its own follow-up because it would touch a separate component with its own versioning/changelog requirements and needs dedicated adapter-level testing.

### adapters/tfa/smtp/index.ts beginLoginChallenge — extract shared challenge preparation

**Reviewer suggestion:** Extract the duplicated `challengeSentAt` / `key` / `code` preparation in `beginLoginChallenge` into a helper shared by both the queue and fallback branches.

**Reason ignored:** This is a refactor suggestion for existing SMTP TFA adapter code rather than a correctness issue in the resend-toast flow. Folding it into this bug fix would expand the scope into unrelated adapter cleanup and require additional version/changelog churn for behavior that is already covered by the current adapter logic and tests.

### login-flow.js resend-link helper naming — rename `getResendLink`

**Reviewer suggestion:** Rename `getResendLink` to `getResendActionLink` so the helper name is more explicit.

**Reason ignored:** The existing name is already specific within this file because the helper only resolves `#login-tfa-resend-action`, and the file has no other competing link helpers. Renaming it would be a no-behavior naming churn inside the just-updated TFA flow without improving correctness for the toast fix.

### login-flow.js delivery toast extraction — create `showDeliveryToastOnce`

**Reviewer suggestion:** Extract the delivery-toast gating from `updateCountdown` into a dedicated helper such as `showDeliveryToastOnce`.

**Reason ignored:** The toast state depends entirely on the local `deliveryToastShownOnce` and `skipDeliveryToast` values that are already consumed at the single callsite where the countdown state is evaluated. Pulling that three-line guard into another helper would add indirection without materially improving readability, testing, or behavior for this targeted regression fix.

## Code Review — TFA deferred-initiation fix follow-up

### adapters/tfa/smtp/index.ts code-generation retry budget — revisit adaptive limit

**Reviewer suggestion:** Reconsider whether the fixed `MAX_CODE_GENERATION_ATTEMPTS` value is sufficient for shorter SMTP code lengths.

**Reason ignored:** The current loop is collision-avoidance against a single live code (not global uniqueness), so collision probability remains low even at 4 digits and the bounded retry cap prevents pathological loops. Raising or making this limit adaptive would be a policy/performance tuning change that needs separate analysis and load/risk discussion rather than being folded into this targeted correctness fix.

### gateways/tfa/ui/login-flow.js method initiation gating — replace SMTP ID check with generic method flag

**Reviewer suggestion:** Remove the hardcoded `method.id === "smtp"` initiation condition in favor of a generic `requiresInitiation`-style method property.

**Reason ignored:** The current API payload for login methods does not expose a generic initiation contract, and adding one would require cross-layer contract changes (gateway response shape, UI rendering assumptions, and adapter compatibility) beyond this bugfix scope. This should be handled as a dedicated protocol enhancement task to avoid introducing implicit partial contracts.
