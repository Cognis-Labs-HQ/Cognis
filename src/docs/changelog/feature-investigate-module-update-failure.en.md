# Reliable Module Updates

## Completed installs stay successful

Module updates no longer report a completed checkout replacement as failed when the immediate runtime refresh encounters an error. Cognis records the refresh failure for operators, and the normal enable flow refreshes the runtime before activating the installed module.
