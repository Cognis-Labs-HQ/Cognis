# Performance budgets

Production traffic terminates at the `cognis-web` proxy. It always listens on HTTP and opportunistically enables HTTPS, with an HTTP-to-HTTPS redirect, when both configured TLS certificate files exist and are readable. Without usable certificates it remains HTTP-only for operation behind a reverse proxy or CDN. The same cache policy applies in either case.

## Hosted baseline protocol

Run three Lighthouse samples against a hosted release and retain the median artifact in CI: cold load with an empty profile, warm load after one priming visit, and SPA navigation from Dashboard to Settings. Emulate a 150 ms round trip, 1.6 Mbps downstream, 750 Kbps upstream, and 4x CPU slowdown. Record the release SHA, region, browser version, cold/warm state, request count, compressed bytes, LCP, route-mount duration, and API p95.

## Budgets

| Journey        | Requests | Compressed transfer |      LCP | API p95 |
| -------------- | -------: | ------------------: | -------: | ------: |
| Cold load      |       45 |             500 KiB | 2,500 ms |  400 ms |
| Warm load      |       15 |             150 KiB | 1,800 ms |  300 ms |
| SPA navigation |       10 |             100 KiB | 1,500 ms |  250 ms |

An optimization is accepted only after the same hosted protocol shows no budget regression relative to the retained baseline. Investigate database queries, payloads, cache policy, and application work first. Introduce Redis only when these measurements demonstrate a persistent cacheable bottleneck that the in-process and web caches cannot address.
