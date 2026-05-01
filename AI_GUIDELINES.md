# AI Guidelines for Cognis Contributions

Use this file for implementation reminders specific to AI-assisted coding.

## Architectural reminders
- Keep route handlers thin and delegate behavior to services/gateways.
- Prefer gateway/adapter abstractions for avoiding direct interactions between subsystems
- Promote reusable logic into `ui/src/reuse` and shared layout primitives.
- Avoid duplicated request/serialization logic across routes and pages.
- Treat `cognisctl` as the operational control surface; add mechanism controls there before embedding ad-hoc scripts.
- Use the `user:*` command namespace for account operations (`create`, `role`, `set-password`, `disable`, `enable`, `delete`).
- Keep user preferences under the user namespace and expose reset semantics only (`user:preferences:clear`) rather than granular per-key mutations.
- For module-specific controls, prefer pluggable CLI subcommands (`modules/<id>/cli/index.js`).
- Add logging, tests and documentation for all new features.
- Always apply best practices where they are viable for achieving requested functionality
- Always take the opportunity to improve existing code in alignment with these principles

## Code quality reminders
- Prioritize readability over terseness.
- Format all new or modified code for human readability first; do not compress logic, markup, or styles into dense one-liners when a multi-line structure is clearer.
- Keep modules focused and cohesive.
- Avoid speculative comments; annotate only non-obvious technical constraints.
- Keep docs user/product oriented; keep AI process guidance out of product docs.
