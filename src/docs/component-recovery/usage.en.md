# Usage

Practical procedures for Component Recovery.

## Prerequisites

Review [the access requirements](/docs/component-recovery) before performing these procedures.

## Examples

```sh
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all -v
cognisctl -v component:info module study-language-en
cognisctl --version
```

```sh
cognisctl component:upgrade module analytics --force
cognisctl component:disable module analytics --force
```

## Expected Results

The example uses the documented interface of Component Recovery. Confirm the response or saved state described in [Technical](/docs/component-recovery/technical) before repeating a write operation.

## Troubleshooting

If Component Recovery is unavailable, verify your sign-in and ask an administrator to check whether the component and its dependencies are enabled.
