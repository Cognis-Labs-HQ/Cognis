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
