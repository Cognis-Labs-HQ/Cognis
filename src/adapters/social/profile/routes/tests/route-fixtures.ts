import { VolatileProfileStore } from "../../store-contract.js";

export function fakeFileGateway() {
    const store = new Map<string, Buffer>();
    return {
        async put(key: string, content: Uint8Array) {
            store.set(key, Buffer.from(content));
            return { key, size: content.length, lastModified: new Date() };
        },
        async store(userId: string, content: Uint8Array, contentType?: string) {
            const extension =
                (
                    {
                        "image/jpeg": "jpg",
                        "image/jpg": "jpg",
                        "image/png": "png",
                        "image/webp": "webp",
                        "image/gif": "gif",
                    } as Record<string, string>
                )[contentType ?? ""] ?? "";
            const uuid = `test-uuid-${store.size}`;
            const key = extension
                ? `${userId}/${uuid}.${extension}`
                : `${userId}/${uuid}`;
            store.set(key, Buffer.from(content));
            return { key, size: content.length, lastModified: new Date() };
        },
        async get(key: string) {
            return store.get(key) ?? null;
        },
        async delete(_: string, key: string) {
            store.delete(key);
            return true;
        },
        async list() {
            return [];
        },
        _has(key: string) {
            return store.has(key);
        },
        _keys() {
            return Array.from(store.keys());
        },
    };
}

export function makeReq(
    method: string,
    token: string | null,
    body?: string | Buffer,
    contentType?: string,
) {
    const chunks = body
        ? [Buffer.isBuffer(body) ? body : Buffer.from(body)]
        : [];
    return {
        method,
        headers: {
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...(contentType ? { "content-type": contentType } : {}),
        },
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) yield chunk;
        },
    } as any;
}

export async function setupUser(
    profileStore: VolatileProfileStore,
    username: string,
    visibility = "hidden",
): Promise<void> {
    await profileStore.createProfile(username, username);
    await profileStore.updateProfile(username, {
        visibility: visibility as any,
    });
}
