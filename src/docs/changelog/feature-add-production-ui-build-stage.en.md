# Production UI Build

## Hashed production assets

The production image now serves minified, content-hashed JavaScript and CSS bundles through a generated manifest while development continues to serve source modules.

## Precompressed delivery

Text assets are emitted with Brotli and gzip variants and negotiated by the neutral UI route with immutable caching and correct MIME metadata.

## Compiled server runtime

The Docker build compiles TypeScript and starts JavaScript directly without the development `tsx` loader.

## Compiled component startup

Production gateway and adapter loaders now resolve every TypeScript source entrypoint to its compiled JavaScript output, and Study adapters receive the platform flow API during bootstrap.
