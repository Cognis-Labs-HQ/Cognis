# Persistent Contextual Help

**Feature Branch:** feature-tooltip-owner-repaired

## Read help with focus or hover

Shared information buttons retain help while focused or while the pointer is on the button or panel. Moving between buttons selects the current explanation without allowing an old pointer event to close it. The fixed themed panel preserves its placement and permits pointer movement across its gap. When keyboard focus switches explanations while the pointer remains on the shared panel, that panel interaction belongs to the newly displayed explanation until a pointer departure or dismissal.

## Dismiss and leave cleanly

Escape closes help without moving focus, preserving other Escape actions and existing descriptions. A new interaction can reopen it. Removed buttons and page changes release their visible help. Existing localized text and tutorial controls remain unchanged.

## Commits

- [015f5ccca865fa29afd10f670f2b54fa0177cbc9](https://github.com/Cognis-Labs-HQ/Cognis/commit/015f5ccca865fa29afd10f670f2b54fa0177cbc9)
