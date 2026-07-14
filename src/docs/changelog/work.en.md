# Share Flow Fix

## Fixed whiteboard share links

Whiteboard share-link creation now ignores unsupported results from other share-enabled modules and selects the matching authorized whiteboard result, preventing false 403 errors when multiple modules extend the same Share flow.

## Kept meeting shares isolated

Meeting share hooks and the Share gateway now select successful matching stage results instead of assuming the first hook result belongs to the requested resource, so whiteboard and meeting sharing can coexist safely.
