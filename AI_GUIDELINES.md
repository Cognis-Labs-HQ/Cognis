# AI Guidelines for Cognis Contributions

Use this file for implementation reminders specific to AI-assisted coding.

## Architectural reminders
- Keep route handlers thin and delegate behavior to services/gateways.
- Prefer gateway/adapter abstractions for provider-specific execution.
- Promote reusable logic into `ui/src/reuse` and shared layout primitives.
- Avoid duplicated request/serialization logic across routes and pages.

## Code quality reminders
- Prioritize readability over terseness.
- Keep modules focused and cohesive.
- Avoid speculative comments; annotate only non-obvious technical constraints.
- Keep docs user/product oriented; keep AI process guidance out of product docs.
