# Study Practice Fixes

**Feature Branch:** feature-update-external-package-contract-definitions

## Allow unknown source readings

Writing-unit schemas retain the standard pronunciation and audio field types while allowing providers to make pronunciation values optional. Japanese packs now enable without fabricating readings; required values and invalid types remain validated.

## Keep drawing frames consistent

Floating drawing pads open in a large frame independent of the current word or pattern aspect ratio. Switching cards preserves the position and any manual resizing; drawings retain their proportions inside the canvas.

## Guide the whole pattern consistently

Before the first input, an uncompleted pattern shows every stroke. After input begins, only the next stroke is guided across every character boundary. Previously completed patterns start with next-stroke guidance and retain hidden-stroke knowledge tests and the reveal action.

## Remember drawing progress

Drawing completion and the number of strokes to hide are stored per account and card through the preference store. Each attempt, reset, and retry samples fresh distinct positions from that count. A successful completion with at most one mistake increases the count by one, capped to the current stroke count. Completed patterns keep next-stroke guidance, while uncompleted patterns preview the whole pattern before input. Authenticated GET and POST requests to `/api/v1/study/drawing/:cardId` run through the `study:drawing:readProgress` and `study:drawing:complete` flows; the browser never supplies an account identity.

## Commits

- [7c13999](https://github.com/Cognis-Labs-HQ/Cognis/commit/7c139996e214333425b23342aae45de133d2bbab)
- [a36941c](https://github.com/Cognis-Labs-HQ/Cognis/commit/a36941c258afaa3b6c528fabfb80b8c3a1fc211d)
