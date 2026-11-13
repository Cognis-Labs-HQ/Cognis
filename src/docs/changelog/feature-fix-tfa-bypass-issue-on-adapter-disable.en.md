# TFA adapter disable login bypass

**Feature Branch:** feature-fix-tfa-bypass-issue-on-adapter-disable

## Disabled TFA adapters no longer block login

When an administrator disables a TFA adapter that users previously configured, login now treats those methods as unavailable for enforcement and bypasses TFA instead of returning a temporary-unavailable error.

## Commits

- [5b67ac9](https://github.com/Cognis-Labs-HQ/Cognis/commit/5b67ac95fe2b594f8b76c38d73dfdf5adf945dbf)
