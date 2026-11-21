# Usage

Practical procedures for External Modules.

## Prerequisites

Administrators need a trusted module source and compatible dependencies.

## Examples

Install a trusted package, review its declared settings and permissions, enable it and verify its contributed page or action.

A repository declares its stable identity and bootstrap entrypoint in `manifest.json`:

<!-- prettier-ignore -->
```json
{
  "uuid": "123e4567-e89b-42d3-a456-426614174000",
  "id": "example-module",
  "version": "1.0.0",
  "entrypoints": { "bootstrap": "bootstrap.js" }
}
```

The bootstrap contributes behavior only through its scoped context and returns cleanup for resources it owns:

<!-- prettier-ignore -->
```js
export async function bootstrapModule(ctx) {
  ctx.registerFlow({ id: 'example-module:constructPage', stages: ['content'] });
  ctx.flow.extend('example-module:constructPage', 'content',
    { id: 'example-module:content' }, async () => ({ ready: true }));
}
```

An administrator installs the repository from **Modules**, reviews its integrity and dependencies, explicitly enables it, and can later disable it to remove all registered UI and backend behavior without restarting Cognis.

## Expected Results

The module's lifetime owns its routes and registrations; disabling it removes those contributions.

## Troubleshooting

Check signature or package validation, dependencies and logs. A module cannot acquire another component's private implementation merely by declaring a feature.
