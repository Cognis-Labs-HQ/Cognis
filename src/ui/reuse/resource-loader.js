/**
 * Loads explicitly requested browser scripts through a host-owned lifecycle.
 *
 * Public exports:
 * - `loadScript(options)` — loads and reference-counts one script resource.
 * - `resourceLoader` — capability object exposing `loadScript`.
 *
 * @example
 * ```js
 * const resource = await resourceLoader.loadScript({
 *   id: 'component:runtime',
 *   src: 'https://example.com/runtime.js',
 *   globalName: 'ExampleRuntime',
 * });
 * resource.value.start();
 * resource.dispose();
 * ```
 *
 * @param {{ id: string, src: string, globalName?: string }} options
 * @returns {Promise<{value: unknown, global: unknown, dispose: () => void}>}
 */

import { uiCtx } from "./ui-ctx.js";

const RESOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9:._-]{0,127}$/;
const GLOBAL_NAME_PATTERN = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;
const resources = new Map();

function readGlobal(globalName) {
    if (!globalName) return undefined;
    return globalName
        .split(".")
        .reduce((value, segment) => value?.[segment], globalThis);
}

/**
 * Loads a validated script once and returns a reference-counted handle.
 *
 * @param {{ id: string, src: string, globalName?: string }} options
 * @returns {Promise<{value: unknown, global: unknown, dispose: () => void}>}
 */
export async function loadScript({ id, src, globalName = "" } = {}) {
    const normalizedId = String(id ?? "").trim();
    const normalizedGlobalName = String(globalName ?? "").trim();
    if (!RESOURCE_ID_PATTERN.test(normalizedId)) {
        throw new Error("invalid_resource_id");
    }
    if (
        normalizedGlobalName &&
        !GLOBAL_NAME_PATTERN.test(normalizedGlobalName)
    ) {
        throw new Error("invalid_resource_global_name");
    }
    const url = new URL(String(src ?? ""), window.location.origin);
    if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password
    ) {
        throw new Error("invalid_resource_url");
    }

    const existing = resources.get(normalizedId);
    if (existing) {
        if (existing.src !== url.href) throw new Error("resource_id_conflict");
        existing.references++;
        await existing.ready;
        return resourceHandle(existing, normalizedGlobalName);
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = url.href;
    script.dataset.cognisResourceId = normalizedId;
    const resource = {
        id: normalizedId,
        src: url.href,
        script,
        references: 1,
        ready: new Promise((resolve, reject) => {
            script.addEventListener("load", resolve, { once: true });
            script.addEventListener(
                "error",
                () => reject(new Error("resource_load_failed")),
                { once: true },
            );
        }),
    };
    resources.set(normalizedId, resource);
    document.head.append(script);
    try {
        await resource.ready;
    } catch (error) {
        resources.delete(normalizedId);
        script.remove();
        throw error;
    }
    return resourceHandle(resource, normalizedGlobalName);
}

function resourceHandle(resource, globalName) {
    const value = readGlobal(globalName);
    let active = true;
    return {
        value,
        global: value,
        dispose() {
            if (!active) return;
            active = false;
            resource.references--;
            if (resource.references > 0) return;
            resources.delete(resource.id);
            resource.script.remove();
        },
    };
}

export const resourceLoader = Object.freeze({ loadScript });

uiCtx.capabilities.contribute("ui:resourceLoader", resourceLoader);
