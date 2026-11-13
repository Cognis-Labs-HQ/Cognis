# Complete type checking

**Feature Branch:** feature-complete-type-verification

## TypeScript source checks

Run `npm run typecheck` before committing. `npm run ci:test` checks types before running tests; both CI pipelines use the same checker. `npm run build` separately emits production assets through esbuild for Node 24.

The root `tsconfig.json` is the authoritative strict, no-emit project. It includes every `.ts`, `.tsx`, `.mts` and `.cts` file under `src`, including declarations, tests, optional components and nested components. Only generated `dist` directories and dependencies are excluded. New components need no reference-list update.

NodeNext resolution, ES2024 and DOM libraries support the server and browser contracts. `@cognis/core` resolves to this checkout’s source. Imported first-party JavaScript contributes inferred types with `allowJs`; `checkJs` remains disabled, so this is not whole-JavaScript verification. Component configurations do not limit root coverage.

Coverage tests compare the compiler inventory with the nonempty source inventory, run the real npm command on static fixtures, reject production and test errors independently, and verify repeated clean runs emit no files.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/61adeda08a08fbf2b6dc7f1cabfb6e1303410f83
