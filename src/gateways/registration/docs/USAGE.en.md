# Usage

Practical procedures for Registration.

## Prerequisites

Owners manage invitation policy; issuance depends on role and enabled providers.

## Examples

Review policy, issue an allowed invitation and redeem it with the invited address; use the public form only if public registration is enabled.

A public-signup caller obtains the registered capability. The result contains username, enabled and the provider’s role:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Expected Results

Account creation follows the active provider and policy; an invitation remains usable if account persistence fails.

## Troubleshooting

Check token expiry, address match and issuance limits. External sign-in does not bypass registration authorization.
