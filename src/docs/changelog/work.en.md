# Reliable CI Checks

## Source files remain within the size guardrail

Split session-unlock persistence, calendar detail styling, meeting page elements, whiteboard search and status handling, and page-composer DOM preservation into focused sibling modules so each source file remains within the 1000-line limit.

## Docker profile tests run with restricted paths

Docker profile tests now invoke required system executables by absolute path, preventing unrelated or restricted `PATH` settings from causing misleading spawn failures.
