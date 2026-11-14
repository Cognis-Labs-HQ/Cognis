# Keep Profile Hero Images

**Feature Branch:** feature-profile-hero-media-integrated

## Keep Images During Updates

Profile avatar and banner images remain mounted during unrelated updates and temporary read failures. Changed keys, confirmed absence and access denial still clear the correct image.

## Own Media Lifetimes

Profile 3.0.20 scopes asynchronous reads, uploads, deletion and file selection to the active route, session and provider. Abandoned object URLs are released, and stale completions cannot affect a newer profile. Existing editor and avatar-preview contracts remain intact.

## Commits

- [e2d18a51ae725e07640cebf8075608a6a30c9f64](https://github.com/Cognis-Labs-HQ/Cognis/commit/e2d18a51ae725e07640cebf8075608a6a30c9f64)
- [bdae30cb07f54e064c4ef5d284aa59646e0c200e](https://github.com/Cognis-Labs-HQ/Cognis/commit/bdae30cb07f54e064c4ef5d284aa59646e0c200e)
