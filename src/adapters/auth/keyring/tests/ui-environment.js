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
export const keyringSource = readFileSync(
    resolve(import.meta.dirname, "../ui/keyring.js"),
    "utf8",
);

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
