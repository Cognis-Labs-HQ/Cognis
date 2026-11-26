# Usage

Create or update a documentation bundle and check its required layout before submitting it.

## Prerequisites

Identify the owning component or core topic and verify the supported actions against its implementation. Prepare all four languages: `en`, `de`, `id` and `ja`.

## Examples

Copy the three role templates for each language from `.github/documentation/` into the owner’s `docs/` directory. For a core topic, use its directory under `src/docs/` and rename each README template to INFO. Keep uppercase basenames and locale suffixes. Replace every instruction with accurate content; retain the exact headings from the [layout matrix](/docs/standard/technical).

Declare the English README, USAGE and TECHNICAL paths in a component manifest. Core topics are discovered by directory and do not need a separate manifest. Run these commands from the repository root:

```sh
npm run check:docs
node --experimental-vm-modules --import tsx --test src/tooling/tests/documentation/*.test.js
```

## Expected Results

The documentation command reports `Component documentation bundles and requested branch comparison are valid.` The tests verify all shipped bundles and reject mutated layouts. The localized standard’s heading matrix must match the validation schema.

## Troubleshooting

For `Required H2 order`, restore the exact headings and sequence for that role and language. For `Empty section` or `Missing introductory paragraph`, write visible component-specific text; a comment is not content. Close code fences with the same character and sufficient length. Move code and endpoint specifications out of Info. Correct the source or target when a link check fails rather than deleting a useful reference.
