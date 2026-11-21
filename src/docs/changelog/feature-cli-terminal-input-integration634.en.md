# CLI Terminal and Input

**Feature Branch:** feature-cli-terminal-input-integration634

## Keep prompts and results separate

Progress pauses while a wizard owns terminal input and resumes after submission. Prompts and progress use stderr, leaving stdout for final results. EOF, Ctrl-C and SIGINT fail without command mutation and restore the terminal. Explicit arguments remain available for noninteractive use. Discovery reads may occur before prompts.

## Collect and preserve valid input

CLI 0.4.7 uses command-owned schemas for required path, body and query inputs, independently of help grouping. Owner-marked ordinary fields may be visible; passwords, tokens and undeclared fields stay hidden. String whitespace, valid empty collections, false and zero survive. Typed validation rejects invalid numbers, booleans and JSON shapes before command requests; required queries retain explicit empty values. Duplicate field names fail registration. API policy and business validation remain unchanged.

## Verification

Actual executable PTY and public-registration tests cover collisions, output separation, cancellation, secret masking, empty arrays/objects, exact passwords, typed inputs, queries and ambiguous names. Focused tests do not establish live backend outcomes or complete every advertised workflow. No deletion outcome repair or TFA enrollment overhaul is included.

## Commits

- [5e4b8cbd671c4e1c93366810337d2f9ba0921c69](https://github.com/Cognis-Labs-HQ/Cognis/commit/5e4b8cbd671c4e1c93366810337d2f9ba0921c69)
- [8d26b79ea4b76c6239b69ddee8a1db69fa7b84f3](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d26b79ea4b76c6239b69ddee8a1db69fa7b84f3)
