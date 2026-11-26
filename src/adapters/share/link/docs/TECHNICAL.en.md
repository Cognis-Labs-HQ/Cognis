# Technical Reference

The public interfaces and operational rules of Public Share Links.

## Interfaces

createShareAdapter returns method link, its public delivery page and Link popup. prepare clears recipients for public delivery; Share owns token creation and authorization.

## Configuration

Each share supplies accessControls, expiry and optional password protection. allowedPermissions constrains the popup; no external link-delivery account is configured by this adapter.

## Behavior

Popup styles resolve image assets relative to the stylesheet within the adapter’s published static directory. The mail icon remains owned and served by this adapter.

### Link sharing adapter

The adapter declares the Link popup with `navbarPlugins`, including its provided capabilities. The gateway loads declared contributions and disables them with their owning adapter.

## Security

Link holders receive only the gateway-authorized resource scope. Expiry, password protection and revocation remain enforced when resolving access; caller permission ceilings restrict selectable grants.

## Reference

### Technical specification

The adapter validates its method-specific recipient or token inputs, delegates shared-resource orchestration to the Share gateway, and remains active only while its owning gateway and adapter lifecycle are enabled.

Callers may set `allowedPermissions: ["read"]` on the share popup to expose only the permissions their resource implements. User permission choices and updates respect this list; resource owners remain responsible for enforcing the same permissions in their authorization flow.
