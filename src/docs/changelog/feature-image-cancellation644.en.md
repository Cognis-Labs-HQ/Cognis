# Image preview cancellation

**Feature Branch:** feature-image-cancellation644

## Cancel pending image previews

Caller cancellation or provider removal releases a pending image preview without waiting for locale or popup stylesheet preparation. Late preparation cannot reopen the canceled viewer or show its failure feedback. Other callers continue sharing preparation normally.

## Preserve viewer ownership

The public open action rejects with AbortError on cancellation; deliberate Close still completes normally. Replacing a thumbnail under the same live caller signal preserves its original-image snapshot. Without a caller signal, the viewer remains provider-owned; unrelated route changes do not close it. Image URLs stay caller-owned. Existing Library tutorial targets and actions are unchanged; cancellation adds no user step.

## Commits

- [fe51fe39b951d3e084ab19d0dcb909be0157480d](https://github.com/Cognis-Labs-HQ/Cognis/commit/fe51fe39b951d3e084ab19d0dcb909be0157480d)
- [b7ecbc93b5014f8a916cd8d87631e39cb3db39a6](https://github.com/Cognis-Labs-HQ/Cognis/commit/b7ecbc93b5014f8a916cd8d87631e39cb3db39a6)
