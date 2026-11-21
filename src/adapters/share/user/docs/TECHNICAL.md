# Technical Reference

The public interfaces and operational rules of Share with People.

## Interfaces

Share with People is integrated through the owning gateway; its manifest identifies the component and required dependencies.

## Configuration

Configuration is supplied through the owning gateway. Share with People declares no additional configuration in its manifest.

## Behavior

### Usage examples

Grants a resource directly to Cognis users through the Share gateway. The adapter validates user recipients and owns the User page shown inside the gateway popup.

## Security

Access to Share with People is governed by the caller and its owning gateway. Enabling a component does not grant additional account permissions.

## Reference

### Technical specification

The adapter validates its method-specific recipient or token inputs, delegates shared-resource orchestration to the Share gateway, and remains active only while its owning gateway and adapter lifecycle are enabled.

See the [shared contract](/docs/adapters/share/link/technical) for this behavior.
