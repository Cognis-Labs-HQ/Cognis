# CLI Component Coverage

## Component CLI discovery

The CLI now discovers command plugins from modules, gateways, and adapters, including manifest-declared CLI entrypoints, and gives dynamically registered commands formatted output by default.

## Component operations

`component:list` now reports modules, gateways, and adapters by component type. The GitHub import command is now `component:import`, and adapter config/test controls are available through `component:config:get`, `component:config:set`, and `component:test`.
