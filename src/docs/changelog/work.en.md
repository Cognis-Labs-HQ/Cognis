# Whiteboard Sync Fix

## Element saves stay synced

Whiteboard snapshot saves now use the structured database update field when refreshing board timestamps, preventing the API from returning 400 after a canvas edit.

## Route tests mirror real updates

The whiteboard route tests now exercise structured update payloads so future persistence regressions match production database behavior.
