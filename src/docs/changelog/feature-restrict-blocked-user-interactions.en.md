# Stronger Block Privacy Across Discovery and Meetings

**Feature Branch:** feature-restrict-blocked-user-interactions

## Blocked users no longer discover blockers in search

Profile search now hides any account that has blocked the requester. This applies to global search, social user search, and meeting participant search, including when the requester has an admin role outside the Administration users page.

## Blocked users are prevented from meeting interactions

Meeting access checks now reject sessions where a meeting organizer or participant has blocked the requester, and meeting notifications skip recipients who should not see organizer activity because of a block.

## Commits

- [17431b6](https://github.com/Cognis-Labs-HQ/Cognis/commit/17431b6df2bdf6b47df8ddfbe98d64a997bb196f)
