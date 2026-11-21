# Usage

Practical procedures for Application Server.

## Prerequisites

Operators deploy the server; readers can use published documentation without administrative access.

## Examples

Select Info, Usage or Technical, choose a component version and switch views while checking that the version stays selected.

Call `store.diff(fromVersion, toVersion)` through a store created by the `docs:versionStore` capability. Runtime modules can return that structured result from their own authenticated route, resolve `ui:documentDiff` through browser ctx, and pass the result to `renderDocumentDiff(diff)`.

Use the authenticated system security or TFA enforcement endpoint to change mandatory enrollment. A failed policy application returns an error instead of a successful save.

`await ctx.getCapability("share:getGuestClaims")(request)`

## Expected Results

Each published version contains a complete localized bundle; unavailable views are not fabricated from unrelated versions.

## Troubleshooting

Check the requested topic, version and server access. Archive writes require a writable configured location.
