# Usage

Practical procedures for Storage Limits.

## Prerequisites

Only administrators manage quota defaults and account overrides.

## Examples

Change a namespace default, then inspect an existing user's quota and adjust its override separately if needed.

## Expected Results

New account provisioning snapshots defaults. Changing a default does not overwrite an existing user's allowance; uploads are checked against both limits.

## Troubleshooting

Compare current usage with global and namespace limits. Raising only one limit may still leave an upload blocked by the other.
