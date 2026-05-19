# Changelog

## Overview

This directory stores changelog entries as one Markdown file per pull request.
Each file captures the scope of a single PR so change history stays modular and
easy to audit.

## Entry format

- Filename: `<branch-name-without-copilot-prefix>.<lang>.md` for each supported
  language (de, en, id, ja). For example, branch `copilot/fix-auth-bug` produces
  `fix-auth-bug.en.md`, `fix-auth-bug.de.md`, `fix-auth-bug.id.md`, and
  `fix-auth-bug.ja.md`
- One set of files per PR (one per language)
- Include:
    - PR title
    - Summary
    - Changed components/files
    - Commit links

## Entries

- [cleanup-strings-and-codebase](/changelogs/cleanup-strings-and-codebase)
