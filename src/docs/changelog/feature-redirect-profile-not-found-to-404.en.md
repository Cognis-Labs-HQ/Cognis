# Profile visibility access

**Feature Branch:** feature-redirect-profile-not-found-to-404

## Follow requires visible requester

Users must now set their own profile visibility to at least private before they can follow another profile, preventing hidden profiles from creating new follow relationships.

## Hidden profiles use 404 page

When a profile cannot be viewed because visibility rules hide it from the current user, the profile app now routes to the standard 404 error page instead of rendering an inline not-found message.

## Error surfaces honor stored theme

The error page and runtime error popup now apply the stored theme before rendering so light-theme users see matching error surfaces even when a route fails early.

## Router protects error navigation roots

The app router now resolves the dashboard root before mounting a route, so profile-to-404 navigation works even when it happens before the dashboard shell has initialized the router.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/af00b98a07aeab0866031d7c25e95c2914df3355
