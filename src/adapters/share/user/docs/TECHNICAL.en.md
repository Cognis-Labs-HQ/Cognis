# Technical Reference

The public interfaces and operational rules of Share with People.

## Interfaces

createShareAdapter returns method user with account delivery. prepare requires recipients; validateUnique rejects an existing user grant. The account-share page requires sign-in.

## Configuration

Provide explicit recipients and resource-allowed permissions through the Share popup. Account delivery uses Cognis identities rather than an external messaging connection.

## Behavior

Account delivery requires the recipient to sign in before the shared resource is resolved. The method contributes its recipient form and account-share page; Share retains token persistence, expiry and revocation.

## Security

Recipients must be explicit account references. Empty recipients and duplicate user grants are rejected; the Share gateway validates the sender's authority and the resource permission ceiling.

## Reference

### Technical specification

The adapter validates its method-specific recipient or token inputs, delegates shared-resource orchestration to the Share gateway, and remains active only while its owning gateway and adapter lifecycle are enabled.

See the [shared contract](/docs/adapters/share/link/technical) for this behavior.
