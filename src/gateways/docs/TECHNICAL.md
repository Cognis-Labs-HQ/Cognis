# Technical Reference

The public interfaces and operational rules of Feature Gateways.

## Interfaces

This workspace supplies shared platform code. Public feature contracts belong to the documented capability, command or gateway; this package does not expose a separate HTTP service.

## Configuration

Host configuration and registered capabilities supply the operating context. This package does not add an independent configuration service.

## Behavior

This package is deployed with Cognis. Individual feature lifecycles own enablement, dependency checks and cleanup.

## Security

Public capabilities and commands retain their per-operation authorization. Installing a package does not grant access to private resources.

## Reference

Source and package metadata: `src/gateways/`.
