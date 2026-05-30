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
