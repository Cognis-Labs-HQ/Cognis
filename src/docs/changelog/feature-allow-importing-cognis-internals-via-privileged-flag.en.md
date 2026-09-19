# Module Runtime Access

**Feature Branch:** feature-allow-importing-cognis-internals-via-privileged-flag

## Allow Cognis runtime resources

Module enablement no longer rejects ordinary imports of exposed Cognis browser resources, direct API URLs, or shared style classes. Operational enablement checks still run, while security-sensitive route and capability registrations continue to require the manifest's `privileged` flag.

## Commits

- [5f898d0ca87f58ca129d2e990ba2ee243becd21b](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f898d0ca87f58ca129d2e990ba2ee243becd21b)
