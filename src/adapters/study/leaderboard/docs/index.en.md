# Study Leaderboards

Unauthenticated definitions and standings requests invoke the injected authentication guard and finish with HTTP 401 before reading leaderboard data. Route parameters use the existing typed HTTP and authorization contracts.

Snapshots are split at Unicode boundaries into rows of at most 60,000 UTF-8 bytes and replaced transactionally. Existing single-row snapshots use the same read path. Metadata methods registerDefinition, assignCohort and setParticipation now return Promise<void> and must be awaited; they execute named ctx flows, propagate storage failures and roll back failed metadata changes. Rollover also returns an awaited promise. Concurrent classroom-board registration shares one pending registration.

The Leaderboard adapter ranks verified learning evidence within authorized cohorts and presents accessible standings.

## Usage

```ts
const leaderboard = ctx.capabilities.require("study:leaderboard");
const table = await leaderboard.requestTableModel(query, "en");
```

## Technical Specification

### Provider integration

The adapter publishes `study:leaderboard` through `ctx`. A language pack or other Study provider can require this capability during bootstrap and register classroom or opt-in event definitions. Definitions select lexicographic or weighted ranking, evidence minimums, rolling or seasonal windows, tie-break rules, cohort policy, and optional promotion or relegation.

Providers submit completed collections through the public `engagement:recordActivity` capability. To attach the resulting XP to a leaderboard, call `scoreActivity` on `study:leaderboard` with the authorized actor, definition ID, criterion ID, and the same evidence-backed activity collection. The leaderboard verifies every event against `study:progress` before recording the observation.

### Privacy and classrooms

Standings expose an alias unless the profile visibility resolver authorizes identity disclosure to the viewer. Blocking and private-account rules remain effective in classrooms. Cohort assignment and opt-in participation are definition-specific, so a classroom stream can coexist with personal and event competition without merging audiences.

### Lifecycle

Use `rollover` to archive the completed season and open the next one. Corrections invalidate prior evidence before replacement. Consumers should use `requestTableModel` for an accessible localized table, while `queryStandings` provides the neutral standings model.

Bootstrap requires the DB gateway. Failed state saves are logged and do not block subsequent saves. Retrying an identical observation persists its state without adding another observation. Classroom access is resolved at call time, including after revocation.

## Durable Practice Rewards

Settled practice XP reaches Leaderboard through `study:leaderboard:recordPractice`, using the saved score rather than consuming modifiers again. Canonical classroom practice creates a classroom XP board with the existing minimum-cohort privacy rule. Explicit XP criteria in accessible, opted-in events can also receive results. Observation identity includes its board and criterion. Corrections invalidate matching observations, and current classroom membership is checked before presenting standings.
