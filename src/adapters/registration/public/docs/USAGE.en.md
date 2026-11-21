# Usage

Practical procedures for Public Registration.

## Prerequisites

An administrator must explicitly enable public registration.

## Examples

Enter a username and password, optionally an email and display name, then submit under the displayed registration policy.

Obtain registration through the gateway capability, rather than calling an adapter from another component:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Expected Results

A valid submission creates a local user account; it cannot request an administrator role.

## Troubleshooting

Check required fields, username availability and public-registration policy if submission is rejected.
