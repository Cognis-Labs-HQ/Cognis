# Toast Style Recovery

**Feature Branch:** feature-toast-stylesheet-retry

## Recover notification styling

Toast stylesheet requests share at most two attempts per loading cycle, each limited to five seconds. Failed attempts release their listeners and owned links; later notifications can retry. Existing stylesheets remain owned by their original loader. Dismissing a toast while styles load does not reopen it.

## Commits

- [1399f21112283fa17986070cd7e4962711634797](https://github.com/Cognis-Labs-HQ/Cognis/commit/1399f21112283fa17986070cd7e4962711634797)
