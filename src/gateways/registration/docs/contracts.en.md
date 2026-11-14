# Registration Contracts

The registration gateway owns public signup and invitation redemption, exposing provider operations through gateway capabilities and routes.

## Usage Examples

A public-signup caller obtains the registered capability. The result contains username, enabled and the provider’s role:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Technical Specification

Invitation redemption uses POST /api/v1/registration/redeem with a JSON object containing token, username, password and optional email and displayName. The gateway forwards the complete input to the invitation provider. That provider owns token validation, account creation and redemption persistence; its failures propagate to the route’s error handling. Public registration uses registration:public:isEnabled for availability and registration:public:register for execution. Disabled gateways reject execution with gateway_disabled; an unavailable public provider rejects it with public_disabled. Availability is checked at execution time. Bootstrap registers these capabilities and extends existing gateAccountCreation and constructRegistrationUi flows through ctx. Callers consume these surfaces rather than importing concrete adapters.

## Restricted Completion

The verifyToken response field carries onboarding authority only. The response's onboardingOperations lists registered operation IDs. The browser keeps the credential within the registration workflow and completes or cancels it before returning to login. Duplicate submissions share the active attempt. A response arriving after page disposal is cleaned up without running extensions or navigating. Failed revocation is reported rather than presented as successful completion. If account creation succeeded but credential issuance failed, accountCreated is true so the user can recover through login; invitation redemption and token persistence are not atomic.

Completion extensions declare an onboardingOperations array in their registration descriptor and implement completeRegistration({values, i18n, descriptor, executeOnboarding}). executeOnboarding(operation, input) returns parsed operation data and rejects undeclared operations. Each operation also requires a current server handler registered with auth:onboarding; descriptor metadata cannot grant authority. Arbitrary authenticated apiFetch is not supplied. Providers must retain actual user choices, validation and version checks rather than treating registration as consent.

This is a breaking extension contract. Migrate Terms of Service to 1.6.13 with its scoped consent operations and canonical constructRegistrationUi hook. Deploy the matching Cognis and module releases together, keeping registration unavailable during a mixed-version rollout. Do not enable the new signup workflow with an unmigrated completion provider. Other external providers must make the same migration; there is no broad-token fallback.

The register page remains outside the authenticated tutorial system. Existing invitation and policy guides retain their controls and targets. Email verification and consent complete before normal login; registration does not complete TFA enrollment.

All operation declarations are copied and frozen before any extension import or callback. A provider declaring onboarding operations must load a callable completion handler before account creation is permitted; field factories and other extensions cannot enlarge its captured permissions.

A failed registration-configuration composition returns registration_configuration_unavailable instead of an empty integration list. Unmigrated completion exports without declared operations also block signup; optional field-only plugins retain independent loading behavior.

## Password Form Labels

Registration 1.2.9 uses the host-owned `ui.reuse.password_requirements` and `ui.reuse.passwords_match` keys, shared with Security. Deploy the matching host UI catalogs and update integrations consuming these labels to the shared keys. Preferred-language values fall back to the same English XML keys; absent or empty English values fail explicitly. The public registration page remains outside authenticated tutorials; invitation and policy guide controls are unchanged.
