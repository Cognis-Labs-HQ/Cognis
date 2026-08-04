# Production UI Build

## Hashed production assets

The production image now serves minified, content-hashed JavaScript and CSS bundles through a generated manifest while development continues to serve source modules.

## Precompressed delivery

Text assets are emitted with Brotli and gzip variants and negotiated by the neutral UI route with immutable caching and correct MIME metadata.

## Compiled server runtime

The Docker build compiles TypeScript and starts JavaScript directly without the development `tsx` loader.

## Compiled component startup

Production gateway and adapter loaders now resolve every TypeScript source entrypoint to its compiled JavaScript output, and Study adapters receive the platform flow API during bootstrap.

## Deterministic browser flows

Built-in browser flow contracts now initialize with the shared UI context, before any bundled gateway hook can extend them.

## Production startup uses compiled assets

The production start command now configures the generated UI manifest and compiled gateway, adapter, and module roots before launching the compiled server.

## Content encoding follows client quality preferences

Static asset negotiation now excludes encodings rejected with a zero quality value and selects the available Brotli or gzip representation with the highest accepted quality.

## Component registration is validated

Production builds now verify every compiled adapter entrypoint. Database and local-file manifests point to their actual entry modules, the files gateway resolves adapters from the configured compiled root, and the Messages adapter loads its room-key contribution from the correct store module.
