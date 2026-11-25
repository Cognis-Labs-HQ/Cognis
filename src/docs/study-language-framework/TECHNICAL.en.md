# Technical Reference

Study discovers enabled language descriptors and presents their registered content through host learning surfaces.

## Interfaces

The Study bootstrap discovers `study:language:<code>` capabilities from active modules. The descriptor supplies `code`, `name`, `flag`, `version`, optional `moduleId` and `childComponents`. Child entries include `id`, `label` or `labelKey`, `pageUrl`, optional script/styles, order and minimum role.

## Configuration

Install and enable the external package through [Modules](/docs/modules/external/usage). Learning-language enrollment is account configuration. Library content schemas and imports are owned by [Library](/docs/adapters/study/library/technical); [Study](/docs/gateways/study/technical) owns navigation and provider lifetimes.

## Behavior

Descriptor synchronization registers available languages and updates child routes when providers change. Host Explore pages do not require every language to implement its own browser page. Layer navigation uses each layer’s declared navigation slug. Providers own language data; host clients handle shared browsing, favourites and practice flows.

## Security

A language descriptor grants neither classroom membership nor content access. Library visibility, canonical references, protected mutations and practice rewards are checked by their owning adapters. Disabling a provider removes its availability; pending browser work follows its page/provider signal.

## Reference

- [src/gateways/study/bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/study/bootstrap.ts)
- [src/gateways/study/gateway.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/study/gateway.ts)
- [src/adapters/study/library/contracts.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/study/library/contracts.ts)
