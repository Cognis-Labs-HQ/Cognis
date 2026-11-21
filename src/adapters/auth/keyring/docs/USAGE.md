# Usage

Practical procedures for Keyring.

## Prerequisites

Use an account with a vault and a feature that stores protected content, such as an encrypted conversation.

## Examples

Open protected content, check which feature requests access, and unlock the vault. In Settings, inspect entries and recent activity, then lock it again.

## Expected Results

Only an unlocked vault supplies secrets. Cancelling access leaves protected content locked; the floating lock control permits a later manual attempt.

## Troubleshooting

Retry a failed state read before creating a vault. A forgotten password cannot decrypt existing entries; destructive reset also removes access to dependent encrypted rooms.
