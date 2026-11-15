# CLI Terminal and Input

**Feature Branch:** feature-cli-terminal-input-integration634

## Keep prompts and results separate

Progress pauses while a wizard owns terminal input and resumes after submission. Prompts and progress use stderr, leaving stdout for final results. EOF, Ctrl-C and SIGINT fail without command mutation and restore the terminal. Explicit arguments remain available for noninteractive use. Discovery reads may occur before prompts.

## Collect and preserve valid input

CLI 0.4.7 uses command-owned schemas for required path, body and query inputs, independently of help grouping. Owner-marked ordinary fields may be visible; passwords, tokens and undeclared fields stay hidden. String whitespace, valid empty collections, false and zero survive. Typed validation rejects invalid numbers, booleans and JSON shapes before command requests; required queries retain explicit empty values. Duplicate field names fail registration. API policy and business validation remain unchanged.

## Verification

Actual executable PTY and public-registration tests cover collisions, output separation, cancellation, secret masking, empty arrays/objects, exact passwords, typed inputs, queries and ambiguous names. Focused tests do not establish live backend outcomes or complete every advertised workflow. No deletion outcome repair or TFA enrollment overhaul is included.

## Commits

- [e1a10f8767ce61c978b12e3dc6952e74edd0449a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e1a10f8767ce61c978b12e3dc6952e74edd0449a)
- [74061fb3de246ca83bab453240a926931e509ba9](https://github.com/Cognis-Labs-HQ/Cognis/commit/74061fb3de246ca83bab453240a926931e509ba9)
- [f19c65ba88130bde7e5343c8cb058cd6bf699e1f](https://github.com/Cognis-Labs-HQ/Cognis/commit/f19c65ba88130bde7e5343c8cb058cd6bf699e1f)
- [8114ac3b70e53bd2fb996d80179d0a5a3743482c](https://github.com/Cognis-Labs-HQ/Cognis/commit/8114ac3b70e53bd2fb996d80179d0a5a3743482c)
