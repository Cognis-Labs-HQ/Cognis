# Whiteboard Save Fixes

## Snapshot saves fixed

Whiteboard element snapshots now use the structured database conflict format so repeated saves update the existing snapshot instead of failing with duplicate keys.

## Share creation stabilized

The sharing flow registration remains on the system context while persistence tests cover repeated session restores and snapshot saves.
