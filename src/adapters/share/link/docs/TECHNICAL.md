# Technical Reference

The public interfaces and operational rules of Public Share Links.

## Interfaces

Public Share Links is integrated through the owning gateway; its manifest identifies the component and required dependencies.

## Configuration

Configuration is supplied through the owning gateway. Public Share Links declares no additional configuration in its manifest.

## Behavior

### Link sharing adapter

The adapter declares the Link popup with `navbarPlugins`, including its provided capabilities. The gateway loads declared contributions and disables them with their owning adapter.

### Usage examples

Creates public, expiring links through the Share gateway. The adapter owns link-specific input preparation and the Link page shown inside the gateway popup.

## Security

Access to Public Share Links is governed by the caller and its owning gateway. Enabling a component does not grant additional account permissions.

## Reference

### Technical specification

The adapter validates its method-specific recipient or token inputs, delegates shared-resource orchestration to the Share gateway, and remains active only while its owning gateway and adapter lifecycle are enabled.

Callers may set `allowedPermissions: ["read"]` on the share popup to expose only the permissions their resource implements. User permission choices and updates respect this list; resource owners remain responsible for enforcing the same permissions in their authorization flow.
