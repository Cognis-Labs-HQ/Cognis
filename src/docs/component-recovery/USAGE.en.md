# Usage

Practical procedures for Component Recovery.

## Prerequisites

Use an authorized administrator and a backup before changing installed code.

## Examples

Run `cognisctl component:list`, inspect the relevant component with component:info and resolve its reported dependency or configuration failure before retrying.

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

A successful recovery restores owned registrations; dependent features remain blocked while requirements are unmet.

## Troubleshooting

Use forced operations only after understanding their impact. An unavailable capability is not permission to bypass component boundaries.
