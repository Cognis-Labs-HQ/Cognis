# Link sharing adapter

The adapter declares the Link popup with `navbarPlugins`, including its provided capabilities. The gateway loads declared contributions and disables them with their owning adapter.

## Usage examples

Creates public, expiring links through the Share gateway. The adapter owns link-specific input preparation and the Link page shown inside the gateway popup.

## Technical specification

The adapter validates its method-specific recipient or token inputs, delegates shared-resource orchestration to the Share gateway, and remains active only while its owning gateway and adapter lifecycle are enabled.

Callers may set `allowedPermissions: ["read"]` on the share popup to expose only the permissions their resource implements. User permission choices and updates respect this list; resource owners remain responsible for enforcing the same permissions in their authorization flow.
