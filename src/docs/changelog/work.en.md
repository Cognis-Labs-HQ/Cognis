# Enforce Safe Study and Module Lifecycles

**Feature Branch:** work

## Respect Library Relationship Deletion Policies

Library deletion planning now follows each schema relationship's `restrict`, `detach`, or `cascade` policy instead of treating every incoming reference as a cascade.

## Keep Progress Persistence Inside Its Flow

The Progress adapter now performs durable event persistence and projection rebuilding in the advertised `persist` and `project` stages, so later extensions observe committed state.

## Close Module Validation Gaps

Boundary validation now detects static CommonJS `require()` calls and scans the complete module before a disabled API entrypoint is loaded.

## Keep Study Language Navigation Canonical

Remembered Study destinations are reused only when the target language actually registers that page; otherwise navigation uses the target language's declared default.

## Evaluate New Core UI Infrastructure for Protection

AI contribution instructions now require explicit protection evaluation whenever core UI functions, rendered objects, components, or classes are created or expanded.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/3dadb7fdb2f6269d735e6b8f7d0cdf8991ac5808
