# Usage

Practical procedures for Command-Line Tools.

## Prerequisites

Use an installed cognisctl wrapper and a valid authorized token for protected commands.

## Examples

Run `cognisctl system:health`, inspect `cognisctl component:list`, then request help for a component-owned command before changing state.

```sh
cognisctl --help
```

Run `cognisctl user:delete <username>`. The existing interactive username prompt also remains available. A failed preflight lookup stops before DELETE is sent. Ordinary confirmed success prints the existing deletion summary and exits 0.

If the account was deleted but cleanup failed, the command reports that deletion occurred and cleanup remains incomplete. Do not repeat deletion to repair dependent resources; review the server failure and the affected component's recovery procedure. Rejected or uncertain deletion also exits 1. Failure text goes to stderr; no success summary goes to stdout.

## Expected Results

Commands display the server result and enforce the same account authorization as HTTP operations.

## Troubleshooting

Check the server URL and COGNIS_CLI_TOKEN_PATH. Tokens and passwords belong in protected configuration, not shared terminal output.
