# Usage

Practical procedures for Local Accounts.

## Prerequisites

Account administrators need an authenticated CLI session to manage another user's credentials.

## Examples

Run `cognisctl user:create` and follow its prompts. Use `cognisctl user:set-password` to replace a local password, or `cognisctl user:disable` to suspend an account.

## Expected Results

Created credentials work through local sign-in; disabled accounts cannot authenticate. The registration interface creates ordinary users, not administrators.

## Troubleshooting

Check the username, enabled state and selected provider. External-provider passwords are managed by that provider, not by changing a Cognis local password.
