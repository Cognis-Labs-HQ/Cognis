# User sharing adapter

## Usage examples

Grants a resource directly to Cognis users through the Share gateway. The adapter validates user recipients and owns the User page shown inside the gateway popup.

## Technical specification

The adapter validates its method-specific recipient or token inputs, delegates shared-resource orchestration to the Share gateway, and remains active only while its owning gateway and adapter lifecycle are enabled.
