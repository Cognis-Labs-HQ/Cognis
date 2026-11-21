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

## Security

State requires sign-in. Policy administration requires administrative access; issuing and listing invitations follows the current invitation policy. Held external identities remain server-owned.

## Reference

### Technical Specification

| Page / surface                      | Guide               | Access         |
| ----------------------------------- | ------------------- | -------------- |
| `/invite`                           | Invitation Guide    | Signed-in user |
| `/administration` · `#registration` | Registration Policy | Administrator  |

See the [shared contract](/docs/adapters/social/messages/technical) for this behavior.
