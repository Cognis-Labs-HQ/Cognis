# Study Leaderboards

## Provider integration

The adapter publishes `study:leaderboard` through `ctx`. A language pack or other Study provider can require this capability during bootstrap and register classroom or opt-in event definitions. Definitions select lexicographic or weighted ranking, evidence minimums, rolling or seasonal windows, tie-break rules, cohort policy, and optional promotion or relegation.

Providers submit completed collections through the public `engagement:recordActivity` capability. To attach the resulting XP to a leaderboard, call `scoreActivity` on `study:leaderboard` with the authorized actor, definition ID, criterion ID, and the same evidence-backed activity collection. The leaderboard verifies every event against `study:progress` before recording the observation.

## Privacy and classrooms

Standings expose an alias unless the profile visibility resolver authorizes identity disclosure to the viewer. Blocking and private-account rules remain effective in classrooms. Cohort assignment and opt-in participation are definition-specific, so a classroom stream can coexist with personal and event competition without merging audiences.

## Lifecycle

Use `rollover` to archive the completed season and open the next one. Corrections invalidate prior evidence before replacement. Consumers should use `requestTableModel` for an accessible localized table, while `queryStandings` provides the neutral standings model.
