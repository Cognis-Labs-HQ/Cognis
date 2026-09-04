# Link sharing adapter

## Usage examples

Creates public, expiring links through the Share gateway. The adapter owns link-specific input preparation and the Link page shown inside the gateway popup.

## Technical specification

The adapter validates its method-specific recipient or token inputs, delegates shared-resource orchestration to the Share gateway, and remains active only while its owning gateway and adapter lifecycle are enabled.
