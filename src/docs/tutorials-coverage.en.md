# Tutorial Coverage

The inventory below covers interactive dashboard pages and component-owned administration surfaces. A guide is available only while its component is enabled, its page or visible section matches, and the account meets its access requirements.

## Coverage

| Page / surface                                   | Guide                    | Access         |
| ------------------------------------------------ | ------------------------ | -------------- |
| `/settings` · `#general`                         | Account Preferences      | Signed-in user |
| `/settings` · `#appearance`                      | Appearance               | Signed-in user |
| `/settings` · `#language`                        | Language Preferences     | Signed-in user |
| `/settings` · `#datetime`                        | Time Preferences         | Signed-in user |
| `/settings` · `#advanced`                        | Advanced Preferences     | Signed-in user |
| `/administration` · `#components`                | Component Administration | Administrator  |
| `/administration` · `#status`                    | System Status            | Administrator  |
| `/administration` · `#security`                  | Security Policies        | Administrator  |
| `/users`                                         | User Administration      | Administrator  |
| `/administration/modules` · `.module-store-grid` | Module Marketplace       | Administrator  |
| `^/docs(?:/\|$)`                                 | Documentation            | Signed-in user |
| `^/changelogs(?:/\|$)`                           | Release History          | Signed-in user |
| `/calendar`                                      | Calendar Guide           | Signed-in user |
| `^/profile(?:/\|$)`                              | Profiles And Posts       | Signed-in user |
| `^/messages(?:/\|$)`                             | Messaging Guide          | Signed-in user |
| `/classes` · `#class-list`                       | Classes Guide            | Signed-in user |
| `/my-classes`                                    | My Classes               | Signed-in user |
| `^/study/leaderboard(?:/\|$)`                    | Leaderboard Guide        | Signed-in user |
| `^/study/(?:[a-z-]+/)?flashcards(?:/\|$)`        | Flashcards Guide         | Signed-in user |
| `^/study/explore(?:/\|$)`                        | Explore The Library      | Signed-in user |
| `^/study/library/search(?:/\|$)`                 | Dictionary Search        | Signed-in user |
| `^/study/(?:library/)?requests(?:/\|$)`          | Library Requests         | Signed-in user |
| `^/study/library(?:/\|$)` · `.library-browser`   | Library Administration   | Administrator  |
| `^/study/(?:settings\|welcome)$`                 | Study Preferences        | Signed-in user |
| `/shares`                                        | Sharing Guide            | Signed-in user |
| `/invite`                                        | Invitation Guide         | Signed-in user |
| `/settings` · `#auth-security-reset-panel`       | Account Security         | Signed-in user |
| `/settings` · `#tfa-settings-panel`              | Two-Factor Security      | Signed-in user |
| `/administration` · `#tfa-enforcement`           | Two-Factor Enforcement   | Administrator  |
| `/settings` · `#notif-matrix-container`          | Notification Preferences | Signed-in user |
| `/administration` · `#notifications`             | Notification Delivery    | Administrator  |
| `/administration` · `#broadcasts`                | Broadcast Administration | Administrator  |
| `/administration` · `[data-files-quota-admin]`   | Storage Quotas           | Administrator  |
| `/administration` · `#logs`                      | Log Inspection           | Administrator  |
| `/administration` · `#registration`              | Registration Policy      | Administrator  |
| `/administration` · `#social`                    | Social Administration    | Administrator  |

## External modules

The companion modules cover Analytics, ElevenLabs, English and Japanese Study, Jitsi meetings and administration, all three legal-document pages, X sign-in configuration, LINE configuration, and Whiteboard canvas/configuration/administration. Their guides remain owned and packaged by their repositories.

The Legal administration section also has a restricted guide for publishing and consent reports.

## Intentional Boundaries

Read-only license/error pages, offline boot code and development fixtures have no action tour. Sign-in callbacks, mandatory consent, password confirmation and required setup dialogs retain their own interaction policy. Recipient share status screens do not automatically expose another account’s content. Embedded surfaces use the tutorial controls available in their own page context.
