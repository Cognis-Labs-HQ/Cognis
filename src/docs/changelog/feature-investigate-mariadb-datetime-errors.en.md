# MariaDB Datetime Repair

**Feature Branch:** feature-investigate-mariadb-datetime-errors

## Account registration accepts ISO timestamps

MariaDB now recognizes fully qualified column names in datetime errors and retries raw-schema writes with canonical `DATETIME` values, preventing account registration from terminating the API runtime.

## Datetime errors are parsed safely

MariaDB datetime errors now use a focused expression to extract the final quoted column identifier, preserving fully qualified column support with substantially less parsing logic.

## Commits

- [5f4972b](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f4972b0a20caebb2e365204dd1c945e05ad0085)
- [5a95fce](https://github.com/Cognis-Labs-HQ/Cognis/commit/5a95fce9c4f66ef6b1f931fb03ec3f54b2e7c22a)
- [2d3d380](https://github.com/Cognis-Labs-HQ/Cognis/commit/2d3d3806)
- [ebc448f1](https://github.com/Cognis-Labs-HQ/Cognis/commit/ebc448f1)
