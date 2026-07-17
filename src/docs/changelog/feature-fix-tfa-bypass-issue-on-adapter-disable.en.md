# TFA adapter disable login bypass

## Disabled TFA adapters no longer block login

When an administrator disables a TFA adapter that users previously configured, login now treats those methods as unavailable for enforcement and bypasses TFA instead of returning a temporary-unavailable error.
