/** Account completion transport. Browser records are read only to migrate old completions. */
import { apiFetch } from "../api-client.js";

const path = "/api/v1/tutorials/completions";
const identifier = /^[a-z][a-z0-9.-]{0,79}:[a-z][a-z0-9.-]{0,79}$/;

export function createTutorialCompletions({
    request = apiFetch,
    storage = () => globalThis.localStorage,
    account = () => storage()?.getItem("cognis_account"),
    identity = () =>
        JSON.stringify([account(), storage()?.getItem("cognis_access_token")]),
} = {}) {
    let cached;
    function current(actor, owner) {
        if (!actor || account() !== actor || identity() !== owner)
            throw new Error("tutorial_completion_identity_changed");
    }
    async function record(actor, ids, owner) {
        current(actor, owner);
        const response = await request(path, {
            method: "POST",
            keepalive: true,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ids }),
        });
        if (!response.ok) throw new Error("tutorial_completion_save_failed");
        current(actor, owner);
    }
    async function load(actor) {
        const owner = identity();
        current(actor, owner);
        if (cached?.owner === owner) return cached.pending;
        const entry = { owner };
        cached = entry;
        entry.pending = (async () => {
            const response = await request(path, { cache: "no-store" });
            if (!response.ok)
                throw new Error("tutorial_completion_load_failed");
            const { data } = await response.json();
            if (
                !Array.isArray(data) ||
                data.some(
                    (id) => typeof id !== "string" || !identifier.test(id),
                )
            )
                throw new Error("invalid_tutorial_completion_response");
            current(actor, owner);
            const completed = new Set(data);
            const legacy = storage();
            const prefix = `cognis_tutorial:${encodeURIComponent(actor)}:`;
            const keys = [];
            for (let index = 0; index < (legacy?.length ?? 0); index++) {
                const key = legacy.key(index);
                if (
                    key?.startsWith(prefix) &&
                    identifier.test(key.slice(prefix.length)) &&
                    legacy.getItem(key) === "completed"
                )
                    keys.push(key);
            }
            for (let offset = 0; offset < keys.length; offset += 100) {
                const batch = keys.slice(offset, offset + 100);
                const ids = batch.map((key) => key.slice(prefix.length));
                await record(actor, ids, owner);
                for (const id of ids) completed.add(id);
                for (const key of batch) legacy.removeItem(key);
            }
            return completed;
        })().catch((error) => {
            if (cached === entry) cached = undefined;
            throw error;
        });
        return entry.pending;
    }
    return {
        load,
        invalidate() {
            cached = undefined;
        },
        async complete(actor, id) {
            const owner = identity();
            const completed = await load(actor);
            await record(actor, [id], owner);
            completed.add(id);
        },
    };
}
