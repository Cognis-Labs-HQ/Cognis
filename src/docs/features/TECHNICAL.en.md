# Technical Reference

This catalog maps installed features to the components that own their interfaces and access rules.

## Interfaces

[Study](/docs/gateways/study/technical) discovers language providers; [Library](/docs/adapters/study/library/technical) owns content and imports; [Flashcards](/docs/adapters/study/flashcards/technical) owns decks and practice. [Calendar](/docs/gateways/calendar/technical) owns events; [Messages](/docs/adapters/social/messages/technical) owns conversations; [Share](/docs/gateways/share/technical) owns delegated links and recipients.

## Configuration

Administrators select enabled components and provider settings. Accounts select their learning languages and preferences. Email delivery requires a configured sender and the relevant account policy; an SMTP schema or an installed SSO adapter alone does not establish a working external transport.

## Behavior

Navigation and supported activities derive from enabled contributions and account access. Feature documentation is not an installation inventory. [UI](/docs/ui/technical) defines shared routing, offline assets and account-scoped offline behavior; domain references define which operations can queue and which require connectivity.

## Security

Visibility, classroom membership, ownership, moderation and delegated grants are separate checks. Role-targeted UI controls do not authorize backend operations. Language data and shared-link access must not bypass the owning component’s policy.

## Reference

- [src/gateways/study/bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/study/bootstrap.ts)
- [src/gateways/calendar/bootstrap/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/calendar/bootstrap/index.ts)
- [src/gateways/share/bootstrap/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/share/bootstrap/index.ts)
