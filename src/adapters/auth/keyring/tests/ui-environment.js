import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const values = new Map();
export const sessionValues = new Map();
export const indexedDbValues = new Map();
export const settingsSource = readFileSync(
    resolve(import.meta.dirname, "../ui/settings.js"),
    "utf8",
);
export const keyringSource =
    readFileSync(
        resolve(import.meta.dirname, "../ui/password-prompts.js"),
        "utf8",
    ) + readFileSync(resolve(import.meta.dirname, "../ui/keyring.js"), "utf8");

Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto,
});
globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
};
globalThis.sessionStorage = {
    getItem: (key) => sessionValues.get(key) ?? null,
    setItem: (key, value) => sessionValues.set(key, String(value)),
    removeItem: (key) => sessionValues.delete(key),
};
globalThis.indexedDB = {
    open() {
        const request = {};
        const database = {
            objectStoreNames: { contains: () => true },
            createObjectStore() {},
            transaction() {
                const transaction = {
                    objectStore() {
                        return {
                            put(record) {
                                indexedDbValues.set(record.id, record);
                                queueMicrotask(() =>
                                    transaction.oncomplete?.(),
                                );
                            },
                            get(id) {
                                const getRequest = {};
                                queueMicrotask(() => {
                                    getRequest.result = indexedDbValues.get(id);
                                    getRequest.onsuccess?.();
                                });
                                return getRequest;
                            },
                            delete(id) {
                                indexedDbValues.delete(id);
                                queueMicrotask(() =>
                                    transaction.oncomplete?.(),
                                );
                            },
                        };
                    },
                };
                return transaction;
            },
            close() {},
        };
        queueMicrotask(() => {
            request.result = database;
            request.onsuccess?.();
        });
        return request;
    },
};

export const remoteVaults = new Map();
Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { origin: "https://keyring.test" },
});

export function authenticate(
    accountId = "test-user",
    origin = "https://keyring.test",
) {
    globalThis.location.origin = origin;
    values.set("cognis_account", accountId);
    values.set("cognis_access_token", `session:${accountId}`);
}

export function resetBrowserStorage() {
    values.clear();
    remoteVaults.clear();
    authenticate();
}

export function cachedVaultKey(
    accountId = values.get("cognis_account"),
    instanceId = `instance:${accountId}`,
) {
    return `cognis_secure_keyring:${encodeURIComponent(JSON.stringify([location.origin, accountId, instanceId]))}`;
}

export const keyringApiFetch = async (_path, options = {}) => {
    const authorization = new Headers(options.headers).get("authorization");
    const accountId = authorization?.replace(/^Bearer session:/, "");
    if (!accountId || authorization !== `Bearer session:${accountId}`)
        return new Response(null, { status: 401 });
    const id = JSON.stringify([location.origin, accountId]);
    if (options.method === "PUT")
        remoteVaults.set(id, JSON.parse(options.body).vault);
    if (options.method === "DELETE") remoteVaults.delete(id);
    return new Response(
        JSON.stringify({
            data: {
                accountId,
                accountInstanceId: `instance:${accountId}`,
                vault: remoteVaults.get(id) ?? null,
                policy: { derivationIterations: 1000 },
            },
        }),
    );
};
globalThis.fetch = keyringApiFetch;
authenticate();

/** Existing tests explicitly provision a vault before testing its unlock behavior. */
export async function provisionAndUnlock(keyring, password) {
    const created = await keyring.createKeyring({
        requestSetupPassword: async () => password,
    });
    return created || keyring.unlockKeyring(password);
}
