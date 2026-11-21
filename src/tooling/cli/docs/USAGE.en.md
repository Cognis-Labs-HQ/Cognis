# Usage

Practical procedures for Command-Line Tools.

## Prerequisites

Use an installed cognisctl wrapper and a valid authorized token for protected commands.

## Examples

Run `cognisctl system:health`, inspect `cognisctl component:list`, then request help for a component-owned command before changing state.

```sh
cognisctl --help
```

## Expected Results

Commands display the server result and enforce the same account authorization as HTTP operations.

## Troubleshooting

Check the server URL and COGNIS_CLI_TOKEN_PATH. Tokens and passwords belong in protected configuration, not shared terminal output.
