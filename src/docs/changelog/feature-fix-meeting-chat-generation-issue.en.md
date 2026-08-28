# Reliable Meeting Chat

**Feature Branch:** feature-fix-meeting-chat-generation-issue

## Reconnect reused meetings to chat

Reused meetings now save the newly resolved chat room so participants no longer request a deleted room and receive a not-found response.

## LDAP participants can join invitations

Meeting participant search retains its follow requirement and excludes the current user. Invitations are delivered to the invitee’s authenticated account, and LDAP-provided participants remain authorized through their stable account identity when their visible handle changes.

## Commits

- [f4538f6](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4538f6775857d81af67d624d800e27ee8b09548)
