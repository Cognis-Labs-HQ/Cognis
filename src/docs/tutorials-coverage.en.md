# Tutorial Coverage

The inventory below covers interactive dashboard pages and component-owned administration surfaces. A guide is available only while its component is enabled, its page or visible section matches, and the account meets its access requirements.

## Coverage

| Page / surface                                             | Guide                         | Access         |
| ---------------------------------------------------------- | ----------------------------- | -------------- |
| `/settings` · `#general`                                   | Account Preferences           | Signed-in user |
| `/settings` · `#appearance`                                | Appearance                    | Signed-in user |
| `/settings` · `#language`                                  | Language Preferences          | Signed-in user |
| `/settings` · `#datetime`                                  | Time Preferences              | Signed-in user |
| `/settings` · `#advanced`                                  | Advanced Preferences          | Signed-in user |
| `/administration` · `#components`                          | Component Administration      | Administrator  |
| `/administration` · `#status`                              | System Status                 | Administrator  |
| `/administration` · `#security`                            | Security Policies             | Administrator  |
| `/users`                                                   | User Administration           | Administrator  |
| `/administration/modules` · `.module-store-grid`           | Module Marketplace            | Administrator  |
| `^/docs(?:/\|$)`                                           | Documentation                 | Signed-in user |
| `^/changelogs(?:/\|$)`                                     | Release History               | Signed-in user |
| `/dashboard`                                               | Workspace And Search Exercise | Signed-in user |
| `/administration/modules/:uuid` · `.module-detail-release` | Module Details                | Administrator  |

## Component Guides

Feature-specific pages, targets and access requirements are documented with their owning component. Optional components do not contribute translations or tutorial definitions to core pages.

- [Calendar Guide](/docs/gateways/calendar/tutorials)
- [Profiles And Posts](/docs/adapters/social/profile/tutorials)
- [Messaging Guide](/docs/adapters/social/messages/tutorials)
- [Classes Guide](/docs/adapters/study/classes/tutorials)
- [Leaderboard Guide](/docs/adapters/study/leaderboard/tutorials)
- [Flashcards Guide](/docs/adapters/study/flashcards/tutorials)
- [Explore The Library](/docs/adapters/study/library/tutorials)
- [Study Preferences](/docs/gateways/study/tutorials)
- [Sharing Guide](/docs/gateways/share/tutorials)
- [Invitation Guide](/docs/gateways/registration/tutorials)
- [Account Security](/docs/gateways/auth/tutorials)
- [Two-Factor Security](/docs/gateways/tfa/tutorials)
- [Notification Preferences](/docs/gateways/notify/tutorials)
- [Storage Quotas](/docs/gateways/files/tutorials)
- [Log Inspection](/docs/gateways/logging/tutorials)
- [Social Administration](/docs/gateways/social/tutorials)

## External Modules

External module coverage is maintained in each module repository’s `docs/` alongside its provider. See [external modules](/docs/modules/external) for the integration contract.

## Intentional Boundaries

Read-only license/error pages, offline boot code and development fixtures have no action tour. Sign-in callbacks, mandatory consent, password confirmation and required setup dialogs retain their own interaction policy. Recipient share status screens do not automatically expose another account’s content. Embedded surfaces use the tutorial controls available in their own page context.

## Dashboard Panels And Actions

The Dashboard walkthrough has 18 steps and deliberately opens the notification pane and account dropdown through their real click handlers. Click exercises suppress hover, while the pane and menu explanations keep destructive or navigational actions inactive. The account guide explains Settings, Documentation, role-specific administration links and Logout. It also covers the page-action dock, language switching, appearance and layout editing.
