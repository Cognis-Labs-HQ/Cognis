# Recover Profile Avatars

**Feature Branch:** feature-profile-avatar-recovery

## Keep Loaded Images

Navbar and hover previews preserve unchanged images through unrelated updates and temporary read failures. Recoverable reads and image errors can retry on the next refresh or opening without permanent cache poisoning.

## Respect Access and Lifetime

Confirmed deletion, access denial, identity changes and provider removal clear images. Bounded account-scoped caching and stale-result checks protect asynchronous refreshes. Profile 3.0.19 and the host consumer ship together. Profile-page hero rendering is outside this change.

## Preview Readiness

Message Style previews require a ready version 2 presentation provider. If Profile or Messages becomes unavailable, only the sample is hidden; the selector and unsaved choice remain usable. The current choice reappears automatically when its providers recover. The optional preview tutorial step follows the same visible region. Deploy matching Settings, Messages 2.8.1 and Profile 3.0.19 assets together.

## Commits

- [2674acd9a6839f9518a23126a2b6293bae5a00fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/2674acd9a6839f9518a23126a2b6293bae5a00fa)
