# Engagement Scoring

The core engagement engine computes evidence-backed XP and awards registered achievements through staged ctx flows.

## Usage

```ts
const record = ctx.requireCapability("engagement:recordActivity");
await record(activity);
```

## Technical Specification

### Provider workflow

Language and activity providers extend engagement only through public `ctx` capabilities. During bootstrap, require `engagement:scoring` to register fallback activity weights, scheduled scoped modifiers, and redeemable boosters. Require `engagement:achievements` to register normal, rare, or legendary badge definitions. Submit a completed collection through `engagement:recordActivity`; do not award XP for individual self-paced item views.

An activity supplies unique evidence event IDs, provider and participant IDs, content difficulty, completion time, optional provider weight, and scopes such as `language` and `activity`. Explicit provider weights override the activity-type fallback. Difficulty, weights, modifiers, hints, accuracy, independent answers, first completion, repeat status, and provider timing targets all contribute to the score. Repeats use one discrete reduced rate rather than continual decay.

### Orchestration

`engagement:recordActivity` runs `engagement:scoreActivity` through `validate`, `score`, `achievements`, and `publish`. Its achievement stage composes `engagement:evaluateAchievements`, whose `collect`, `evaluate`, and `award` stages allow removable contributions. Providers may extend these flows without importing core internals.

### Safety and evidence

Weights and multipliers accept values from `0.01` through `10`; difficulty accepts `0.1` through `10`. Event IDs must be unique, durations and hint counts must be non-negative, and timing targets must be ordered. Consumable boosters are participant-specific and removed after their first matching score. Achievement awards freeze their labels, difficulty, icon, award time, and evidence IDs so later definition changes cannot rewrite earned badges.

## Durable Practice Rewards

`engagement:recordActivity` now validates, scores, evaluates achievements, persists a receipt, then publishes. The host injects `engagement:store`; production storage belongs to the Database gateway. Participant revisions reject conflicting writes. Replaying the same activity preserves its XP and awards; changed inputs or reused evidence are rejected. Scoring and award evaluation use isolated state until persistence succeeds. `engagement:ledger` exposes authoritative summaries, durable booster redemption and activity invalidation. Redeemed boosters and consumed evidence survive restarts. `repeatKey` groups repeated practice without changing the original receipt; corrections remove invalidated XP and award projections while retaining history. Low-level scoring methods remain policy calculators; durable consumers use the ledger and record capability.

Ledger summaries, booster redemption and activity invalidation run dedicated ctx flows with validation and execution stages. Invalid participant identifiers are rejected before reading or changing persistence.
