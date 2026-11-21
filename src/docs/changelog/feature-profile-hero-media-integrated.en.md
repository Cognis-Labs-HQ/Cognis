# Keep Profile Hero Images

**Feature Branch:** feature-profile-hero-media-integrated

## Keep Images During Updates

Profile avatar and banner images remain mounted during unrelated updates and temporary read failures. Changed keys, confirmed absence and access denial still clear the correct image.

## Own Media Lifetimes

Profile 3.0.20 scopes asynchronous reads, uploads, deletion and file selection to the active route, session and provider. Abandoned object URLs are released, and stale completions cannot affect a newer profile. Existing editor and avatar-preview contracts remain intact.

## Commits

- [a1c92e7a120e13504ad560f6f83f1413c0bcd9df](https://github.com/Cognis-Labs-HQ/Cognis/commit/a1c92e7a120e13504ad560f6f83f1413c0bcd9df)
- [997978e1f38ac8d917af0284ec3359effea36f17](https://github.com/Cognis-Labs-HQ/Cognis/commit/997978e1f38ac8d917af0284ec3359effea36f17)
