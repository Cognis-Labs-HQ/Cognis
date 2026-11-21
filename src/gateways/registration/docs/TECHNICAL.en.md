# Technical Reference

The public interfaces and operational rules of Registration.

## Interfaces

`GET /api/v1/registration/state`

`GET /api/v1/registration/policy`

`PUT /api/v1/registration/policy`

`POST /api/v1/registration/invite`

`POST /api/v1/registration/redeem`

`GET /api/v1/registration/tokens`

`POST /api/v1/registration/tokens`

## Configuration

Invitation policy and enabled registration providers determine who may create accounts and invitations. Tokens and registration state are persisted through the DB gateway.

## Behavior

The command-line contributions `invite:create`, `invite:list` and `invite:state` call the declared HTTP operations. Invitation redemption validates the token and registration policy before account creation.

Invitation redemption uses POST /api/v1/registration/redeem with a JSON object containing token, username, password and optional email and displayName. The gateway forwards the complete input to the invitation provider. That provider owns token validation, account creation and redemption persistence; its failures propagate to the route’s error handling. Public registration uses registration:public:isEnabled for availability and registration:public:register for execution. Disabled gateways reject execution with gateway_disabled; an unavailable public provider rejects it with public_disabled. Availability is checked at execution time. Bootstrap registers these capabilities and extends existing gateAccountCreation and constructRegistrationUi flows through ctx. Callers consume these surfaces rather than importing concrete adapters.

## Security

State requires sign-in. Policy administration requires administrative access; issuing and listing invitations follows the current invitation policy. Held external identities remain server-owned.

## Reference

### Technical Specification

| Page / surface                      | Guide               | Access         |
| ----------------------------------- | ------------------- | -------------- |
| `/invite`                           | Invitation Guide    | Signed-in user |
| `/administration` · `#registration` | Registration Policy | Administrator  |

See the [shared contract](/docs/adapters/social/messages/technical) for this behavior.
