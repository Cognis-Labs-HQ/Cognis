# Structured button styling

**Feature Branch:** feature-structured-buttons-542

## Neutral shared controls

Structured default and neutral buttons now receive the canonical neutral class, including existing shared wrapping, font and coarse-pointer sizing styles. Confirm and danger variants retain their respective classes and all native attributes.

## Coverage and contract

Public-renderer and synthetic Administration tests cover variants, escaping, disabled state, repeated rendering and form safety. Shared UI documentation describes the contract in all four languages; existing tutorial steps are unchanged. This is a bounded part of #542, not completion of the full button audit.

## Commits

- [59bae80056379b38b2b9ffd787a4650cbe66c52b](https://github.com/Cognis-Labs-HQ/Cognis/commit/59bae80056379b38b2b9ffd787a4650cbe66c52b)
