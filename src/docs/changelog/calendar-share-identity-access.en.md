# Calendar Identity & Access

## Live calendar names

Calendar client links now derive their collection name from the current Calendar gateway record, with share metadata used only when the live resource is unavailable.

## Read-only user shares

The User sharing adapter now removes write capabilities whenever Read permission is selected. CalDAV discovery therefore exposes only read privileges and calendar clients disable editing.
