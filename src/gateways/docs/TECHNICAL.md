# Technical Reference

The public interfaces and operational rules of Feature Gateways.

## Interfaces

GatewayBootstrapContext supplies capability registration, route registration, UI contributions and lifecycle hooks. Shared adapter-bootstrap helpers execute adapter-owned defineContracts and bootstrap inside an owner scope.

## Configuration

The host supplies gateway and adapter roots through its bootstrap context and deployment configuration. Individual manifests declare identity, version, required dependencies and documentation; provider-specific fields belong to the relevant adapter schema.

## Behavior

Gateway discovery registers enabled owners and their providers. Adapter scopes own contracts, routes and callbacks; failed initialization rolls registrations back. Feature-specific services remain in their gateway directories rather than this workspace entry.

## Security

A registration scope identifies ownership, not user authority. Operations still resolve authenticated callers and resource permissions; optional providers cannot publish another owner's private services.

## Reference

- [src/gateways/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/gateways/package.json)
