# Reliable Connection Recovery

**Feature Branch:** feature-tune-connection-interrupted-detection

## Confirm Connection Interruptions

Connection warnings now require a failed same-origin health check, preventing unrelated API responses and failures from producing a false interruption state. Recovery state is isolated by Cognis origin so separate installations cannot affect one another.

## Refresh After Recovery

Cognis now checks for restored service after a confirmed interruption, keeps the interruption warning visible while adding an informational recovery toast, and refreshes the page when the recovery toast expires. Manually dismissing the recovery toast cancels the refresh so developers can inspect the recovered page state.

## Commits

- [8f529113](https://github.com/Cognis-Labs-HQ/Cognis/commit/8f52911346de2bc69b977b2345e072e7631f8033)

- [16536120](https://github.com/Cognis-Labs-HQ/Cognis/commit/16536120a1eb3de2bceda8db1a0b19ff73bf4e22)

- [9b9ed168](https://github.com/Cognis-Labs-HQ/Cognis/commit/9b9ed168bd6d841e229b2611a2c2f2f0db626c25)
