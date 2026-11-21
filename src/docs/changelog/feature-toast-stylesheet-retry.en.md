# Toast Style Recovery

**Feature Branch:** feature-toast-stylesheet-retry

## Recover notification styling

Toast stylesheet requests share at most two attempts per loading cycle, each limited to five seconds. Failed attempts release their listeners and owned links; later notifications can retry. Existing stylesheets remain owned by their original loader. Dismissing a toast while styles load does not reopen it.

## Commits

- [4eaddc1578dc3e155eda8aec1df7a8a2cb790299](https://github.com/Cognis-Labs-HQ/Cognis/commit/4eaddc1578dc3e155eda8aec1df7a8a2cb790299)
