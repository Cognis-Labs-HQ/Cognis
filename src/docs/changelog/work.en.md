# Whiteboard Sharing Fix

## Share adapter loading fixed

The whiteboard share button now imports its adapter from the static module root so the popup can open without a 404.

## Regression coverage

A UI source test now verifies the share adapter import uses the served static path instead of a non-existent app subdirectory.
