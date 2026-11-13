# TFA Gateway

Adapter language resources are discovered from the installed methods rather than a fixed provider list. Methods report `invalid_verification_code` through the common error contract; issuer-specific configuration belongs to the adapter.

An unfinished enrollment is protected immediately, even before a code is typed. Backdrop, Escape, close, Cancel and SPA navigation use the shared discard confirmation; keeping the form restores focus. Navigation resumes only after cancellation completes. Refresh uses the browser leave warning. Disposing the owning section removes navigation listeners and popups; mandatory authentication setup remains enforced by the server.

## Overview

The TFA Gateway owns every two-factor authentication concern in Cognis. It discovers method adapters under `src/adapters/tfa/`, persists adapter enablement and recovery-code state, decides whether a user must complete TFA setup, and verifies second-factor login challenges.

The auth gateway does not know how TOTP or any future method works. It only authenticates the primary credential step and then consumes TFA capabilities exposed by this gateway. Disabling the TFA gateway therefore removes TFA-specific UI, routes, and verification behavior without destabilising unrelated auth flows.

## Responsibilities

- Discover TFA adapters from `src/adapters/tfa/*`.
- Persist adapter configuration and enabled/disabled state.
- Restore persisted adapter state without force-enabling disabled adapters.
- Expose user-facing setup, enable/disable, preference, and recovery-code routes.
- Enforce setup requirements for accounts when global TFA enforcement is enabled.
- Verify login challenges and consume recovery codes atomically.
- Register TFA-owned settings/admin UI modules and static assets.
- Defer challenge initiation (e.g. sending SMTP codes) until the user explicitly selects a method when multiple methods are available.

Not responsible for: primary credential validation, password policy, or account creation. Those remain auth-gateway concerns.

## Architecture

`src/gateways/tfa/gateway.ts` defines `CoreTfaGateway`. It keeps the adapter registry, delegates method-specific setup and verification to adapters, and centralises shared policy such as preferred-method ordering, recovery-code management, and global enforcement.

Bootstrap in `src/gateways/tfa/bootstrap.ts` performs this sequence:

1. Create `DbTfaStore` and ensure the schema exists.
2. Discover adapters in `src/adapters/tfa/`.
3. Load persisted adapter configs.
4. Register API routes and adapter admin routes.
5. Register TFA-owned settings/admin UI surfaces.
6. Contribute TFA capabilities for auth and other gateways.

## Capability Surface

The gateway contributes these capabilities through `ctx.capabilities`:

- `tfa:getUserStatus(accountId)`
- `tfa:getLoginMethods(accountId)`
- `tfa:verifyLogin(accountId, methodId, payload)`
- `tfa:isSecondFactorEnabled(accountId)`
- `tfa:isSetupRequired(accountId)`
- `tfa:resetUser(accountId)`
- `tfa:getEnforceAllUsers()`
- `tfa:setEnforceAllUsers(required)`

These capabilities are the supported integration surface for auth and UI code. Other components must not import TFA adapter internals directly.

`tfa:getLoginMethods(accountId)` only initiates a login challenge (e.g. sends an SMTP email) when exactly one method is configured for the user. When multiple methods are available, the response includes method identity only — no challenge data. The login UI triggers challenge initiation on demand via `POST /api/v1/tfa/login/resend` when the user explicitly selects a method.

## API Routes

| Method | Path                                   | Description                                          | Auth   |
| ------ | -------------------------------------- | ---------------------------------------------------- | ------ |
| `GET`  | `/api/v1/tfa/status`                   | Read current user's setup requirement state          | Bearer |
| `GET`  | `/api/v1/tfa/methods`                  | List available/enabled methods and recovery metadata | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/setup/begin`  | Start setup for a method                             | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/setup/verify` | Complete setup verification                          | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/setup/cancel` | Cancel an in-progress setup                          | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/enable`       | Re-enable a configured method                        | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/disable`      | Disable a configured method                          | Bearer |
| `PUT`  | `/api/v1/tfa/methods/preferences`      | Save preferred method ordering                       | Bearer |
| `GET`  | `/api/v1/tfa/recovery-codes`           | List recovery-code status                            | Bearer |
| `POST` | `/api/v1/tfa/recovery-codes/rotate`    | Replace recovery codes                               | Bearer |
| `POST` | `/api/v1/tfa/admin/users/:id/reset`    | Reset a user's TFA state                             | Admin  |
| `GET`  | `/api/v1/gateways/tfa/adapters`        | List registered adapters                             | Admin  |

## UI Ownership

TFA-owned browser assets live under `src/gateways/tfa/ui/`. The gateway registers its own settings section, administration section, and static asset directory at bootstrap. TOTP-specific user-facing strings stay with the TOTP adapter under `src/adapters/tfa/totp/languages/`.

This separation is intentional: password-reset controls belong to the auth gateway, while method setup, recovery codes, setup enforcement, and TFA-specific admin controls belong here.

## Adapter Contract

Each adapter directory under `src/adapters/tfa/<adapter-id>/` provides the method-specific logic. Adapters declare identity for admin listings and implement setup / verification flows, but they do not own shared persistence for preferences or recovery codes. Those shared flows remain in `CoreTfaGateway` so additional methods can be introduced without duplicating policy.

## Layered TFA Discard Decisions

After enrollment cancellation is acknowledged, navigation is offered again to the remaining page guards. Discarding enrollment does not discard unrelated Settings changes. Keeping those changes stops navigation; explicitly discarding them resumes it. An unmounted page cannot resume a retained enrollment navigation.

## Method Presentation

Each method supplies `stringsBaseUrl` and `loginUi` metadata: `placeholderKey`, `supportsResend` and `challengeOnSelect`. The login UI discovers these values rather than branching on provider IDs. Configuration labels are provider-owned translation keys.

Adapter contract registration follows [the shared gateway bootstrap contract](/docs/gateways).

## Adapter Management Controls

The administrator-only adapter catalog at `GET /api/v1/gateways/tfa/adapters` publishes each method’s `config`, `enable` and `disable` endpoints. Component lifecycle commands consume these advertised controls for individual and bulk operations instead of guessing routes. The gateway enforces administrator authorization on the catalog and each control; methods do not advertise a test action because this gateway does not implement one.

## Final Session Assurance

The version-1 `tfa:assessSession` capability runs the TFA-owned `readPolicy` and `resolveChallenge` stages before Auth issues a session. Enabled enrollment survives provider outages and still offers recovery codes. Only persisted administrative disablement waives that provider; optional missing or malformed publisher metadata does not disable a valid adapter. Status-store failures and a known active gateway without a working assessment deny login. The gateway records its policy identity before initialization so an initialization failure cannot look like intentional absence. Factor verification and setup completion call `auth:completeSession`; concurrent completion consumes each pending login/setup once. No ordinary token or profile activation occurs while additional assurance is pending. Auth owns final lifecycle validation, token issuance and pending-login cleanup. See the Auth documentation for `auth:login` and the final-session contract.

The host also retains non-executable failure evidence for a discovered gateway whose valid manifest identifies it but whose bootstrap cannot be imported. Only a successful bootstrap clears this evidence. Rollback removes executable routes and assessment hooks; deliberate disablement remains permitted, while re-enable without successful initialization fails closed. Missing or invalid manifests without usable identity cannot be classified by this signal. Auth callers use the version-1 `auth:login` capability, not raw preparation flows.
