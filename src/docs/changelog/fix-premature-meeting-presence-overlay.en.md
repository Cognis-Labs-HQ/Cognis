# Fix Meeting Presence Start

**Feature Branch:** N/A

## Delay presence until real join

Meeting presence tracking and the alone-participant prompt now wait for the real Jitsi conference join instead of starting on the pre-join or waiting-for-moderator screen. Authentication-wait states no longer start heartbeat tracking, so users do not see a premature "alone in meeting" overlay before the meeting is actually underway.

## Commits
