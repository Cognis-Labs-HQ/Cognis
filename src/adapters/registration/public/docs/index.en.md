# Public Registration

Public registration creates an account through the enabled registration provider and can create its profile through an injected capability.

## Usage Examples

Obtain registration through the gateway capability, rather than calling an adapter from another component:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Technical Specification

The adapter accepts username, password, optional email and optional displayName. It trims username and displayName, rejects an empty username or password with username_and_password_required, and calls the account store with the user role. Its result contains username, enabled and role. The account store owns persistence and propagates failures. If createProfile is provided, profile creation is awaited after account creation. The adapter is disabled by default; the gateway checks its public-registration policy and rejects disabled registration. The optional email is part of the input contract but is not passed to the account registration operation.
