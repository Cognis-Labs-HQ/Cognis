# Usage

Practical procedures for Leaderboard.

## Prerequisites

Sign in; classroom boards require current membership and some events require opting in.

## Examples

Select the relevant cohort and period, then compare your position and the board's displayed criteria.

```ts
const leaderboard = ctx.capabilities.require("study:leaderboard");
const table = await leaderboard.requestTableModel(query, "en");
```

## Expected Results

Rankings use eligible evidence and privacy-aware identities; corrections can change standings.

## Troubleshooting

Check participation, cohort eligibility and minimum evidence. A completed activity need not qualify for every board.
