/**
 * Boots a dynamically registered SPA route on a direct browser load.
 *
 * Public exports:
 * - none; this module reads the server-injected route descriptor, imports its
 *   declared capability providers once, then imports the route entry module.
 *
 * @example
 * ```html
 * <script id="spa-page-entry-config" type="application/json">
 *   {"capabilityScripts":["/provider.js"],"scriptUrl":"/page.js"}
 * </script>
 * <script type="module" src="/static/reuse/spa-page-entry.js"></script>
 * ```
 */

const configElement = document.querySelector("#spa-page-entry-config");
const config = JSON.parse(configElement?.textContent ?? "{}");
const capabilityScripts = Array.isArray(config.capabilityScripts)
    ? config.capabilityScripts
    : [];

await Promise.all(capabilityScripts.map((scriptUrl) => import(scriptUrl)));
if (!config.scriptUrl) throw new Error("SPA route script unavailable");
await import(config.scriptUrl);
