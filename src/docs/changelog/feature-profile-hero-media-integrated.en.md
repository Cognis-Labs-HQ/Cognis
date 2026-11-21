# Keep Profile Hero Images

**Feature Branch:** feature-profile-hero-media-integrated

## Keep Images During Updates

Profile avatar and banner images remain mounted during unrelated updates and temporary read failures. Changed keys, confirmed absence and access denial still clear the correct image.

## Own Media Lifetimes

Profile 3.0.20 scopes asynchronous reads, uploads, deletion and file selection to the active route, session and provider. Abandoned object URLs are released, and stale completions cannot affect a newer profile. Existing editor and avatar-preview contracts remain intact.

## Commits

- [fe35a1014c0855146dec07fc429710e92a108822](https://github.com/Cognis-Labs-HQ/Cognis/commit/fe35a1014c0855146dec07fc429710e92a108822)
- [64016cd661bcc27e36e2c379a9541064a2dd71ab](https://github.com/Cognis-Labs-HQ/Cognis/commit/64016cd661bcc27e36e2c379a9541064a2dd71ab)
