# Keep Profile Hero Images

**Feature Branch:** feature-profile-hero-media-integrated

## Keep Images During Updates

Profile avatar and banner images remain mounted during unrelated updates and temporary read failures. Changed keys, confirmed absence and access denial still clear the correct image.

## Own Media Lifetimes

Profile 3.0.20 scopes asynchronous reads, uploads, deletion and file selection to the active route, session and provider. Abandoned object URLs are released, and stale completions cannot affect a newer profile. Existing editor and avatar-preview contracts remain intact.

## Commits

- [7762741ddaf659dcb3b556340f3b73fd0c9aaad0](https://github.com/Cognis-Labs-HQ/Cognis/commit/7762741ddaf659dcb3b556340f3b73fd0c9aaad0)
- [0db12d602c729148e0f0e4d7337b49b090a68284](https://github.com/Cognis-Labs-HQ/Cognis/commit/0db12d602c729148e0f0e4d7337b49b090a68284)
