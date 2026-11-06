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
| `/calendar`                                                | Calendar Guide                | Signed-in user |
| `^/profile(?:/\|$)`                                        | Profiles And Posts            | Signed-in user |
| `^/messages(?:/\|$)`                                       | Messaging Guide               | Signed-in user |
| `/classes` · `#class-list`                                 | Classes Guide                 | Signed-in user |
| `/my-classes`                                              | My Classes                    | Signed-in user |
| `^/study/leaderboard(?:/\|$)`                              | Leaderboard Guide             | Signed-in user |
| `^/study/(?:[a-z-]+/)?flashcards(?:/\|$)`                  | Flashcards Guide              | Signed-in user |
| `^/study/explore(?:/\|$)`                                  | Explore The Library           | Signed-in user |
| `^/study/library/search(?:/\|$)`                           | Dictionary Search             | Signed-in user |
| `^/study/(?:library/)?requests(?:/\|$)`                    | Library Requests              | Signed-in user |
| `^/study/library(?:/\|$)` · `.library-browser`             | Library Administration        | Administrator  |
| `^/study/(?:settings\|welcome)$`                           | Study Preferences             | Signed-in user |
| `/shares`                                                  | Sharing Guide                 | Signed-in user |
| `/invite`                                                  | Invitation Guide              | Signed-in user |
| `/settings` · `#auth-security-reset-panel`                 | Account Security              | Signed-in user |
| `/settings` · `#tfa-settings-panel`                        | Two-Factor Security           | Signed-in user |
| `/administration` · `#tfa-enforcement`                     | Two-Factor Enforcement        | Administrator  |
| `/settings` · `#notif-matrix-container`                    | Notification Preferences      | Signed-in user |
| `/administration` · `#notifications`                       | Notification Delivery         | Administrator  |
| `/administration` · `#broadcasts`                          | Broadcast Administration      | Administrator  |
| `/administration` · `[data-files-quota-admin]`             | Storage Quotas                | Administrator  |
| `/administration` · `#logs`                                | Log Inspection                | Administrator  |
| `/administration` · `#registration`                        | Registration Policy           | Administrator  |
| `/administration` · `#social`                              | Social Administration         | Administrator  |
| `/dashboard`                                               | Workspace And Search Exercise | Signed-in user |
| Flashcards · `[data-study-session]`                        | Manage A Deck                 | Signed-in user |
| Flashcards · `[data-practice]`                             | Practise A Deck               | Signed-in user |
| `/administration/modules/:uuid` · `.module-detail-release` | Module Details                | Administrator  |

## External modules

The companion modules cover Analytics, ElevenLabs, English and Japanese Study, Jitsi meetings and administration, all three legal-document pages, X sign-in configuration, LINE configuration, and Whiteboard canvas/configuration/administration. Their guides remain owned and packaged by their repositories.

The Legal administration section also has a restricted guide for publishing and consent reports.

## Intentional Boundaries

Read-only license/error pages, offline boot code and development fixtures have no action tour. Sign-in callbacks, mandatory consent, password confirmation and required setup dialogs retain their own interaction policy. Recipient share status screens do not automatically expose another account’s content. Embedded surfaces use the tutorial controls available in their own page context.

## Task Walkthroughs

Coverage comprises 55 guides and 175 steps, including 22 administrator guides. Dashboard includes a hands-on search exercise: open the real search control, enter a query, inspect search options and results, and close the finder before continuing. Explanatory steps block accidental hover and activation; interactive steps explicitly allow their target. New contextual guides appear when a flashcard deck, practice session or module details are visible.

Feature guides now cover starting and previewing messages, room membership, post previews, calendar navigation and event planning, recurring-event edits, share filtering and expiry, invitations, library filtering and dictionary comparisons, audio and writing practice, favourites and content requests, deck creation, practice feedback, deck editing/sharing/export, class enrollment, rankings, font preferences, unsaved changes, release notices, user lookup and module configuration/lifecycle. Forms and destructive confirmations remain deliberate feature-owned interactions; guides explain their entry points and yield to required dialogs.

## Dashboard Panels And Actions

The Dashboard walkthrough has 18 steps and deliberately opens the notification pane and account dropdown through their real click handlers. Click exercises suppress hover, while the pane and menu explanations keep destructive or navigational actions inactive. The account guide explains Settings, Documentation, role-specific administration links and Logout. It also covers the page-action dock, language switching, appearance and layout editing.

Each tutorial step now explicitly declares `highlightNext`: explanations that require Next or Finish enable it, while interaction- and wait-driven exercises disable it. The cue retains a static outline for reduced motion. All existing tutorials were reviewed for this distinction, including search results and notification explanations.

Back from outside a completed step group or dependency branch returns to its opener and clears its outcomes. Back within a branch remains sequential. This avoids revisiting a closed Search panel and automatically skipping to the exit.

Page steps can declare `targetMatch: "first"` to select the first visible, usable match inside their declared section. The default remains unique matching. Missing or disabled targets are skipped according to the authored policy. Action-specific highlights now point to editable power switches, role selectors, quota fields, notification tests, share controls, records and module actions. Components uses an editable displayed power switch; required and hidden controls are excluded.
