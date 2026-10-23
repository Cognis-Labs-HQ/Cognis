# Smaller Shell Avatar

**Feature Branch:** perf-shell-avatar-transfer

## Reuse the Optimized Artwork

The shared page shell now uses the existing WebP artwork for its temporary account avatar. This reduces image transfer while profile details load and preserves the artwork dimensions, profile-provider replacement and navigation behavior.

## Protect the Image Budget

A route-level regression checks that the shell placeholder resolves to a served image within its transfer budget. Authentication, private data, module assets and cache policy are unchanged.

## Commits
