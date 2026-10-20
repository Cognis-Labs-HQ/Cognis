import { createHash } from "node:crypto";
import type { LibraryContentPackPlan } from "../types.js";
import type { LibraryAudioCache } from "../audio-cache.js";

export async function storeContentPackAudio(
    plan: LibraryContentPackPlan,
    audioCache?: LibraryAudioCache,
): Promise<void> {
    if (!audioCache) throw new Error("file_gateway_unavailable");
    const assets = new Map(plan.assets.map((asset) => [asset.path, asset]));
    const audioPaths = new Map<string, string>();
    for (const record of plan.records) {
        const layer = plan.schema.layers.find(({ id }) => id === record.layer)!;
        const fields = { ...(record.fields ?? {}) };
        for (const field of layer.fields ?? []) {
            const value = fields[field.id];
            if (field.type !== "audio" && field.type !== "audioList") continue;
            const values = Array.isArray(value) ? value : [value];
            const stored = [];
            for (const audioPath of values) {
                if (typeof audioPath !== "string") {
                    stored.push(audioPath);
                    continue;
                }
                const cached = audioPaths.get(audioPath);
                if (cached) {
                    stored.push(cached);
                    continue;
                }
                const asset = assets.get(audioPath);
                if (!asset || !asset.mediaType.startsWith("audio/"))
                    throw new Error("audio_asset_not_found");
                const key = `packs/${createHash("sha256")
                    .update(
                        `${plan.manifest.publisher}:${plan.manifest.id}:${plan.manifest.version}:${audioPath}`,
                    )
                    .digest("hex")}.audio`;
                await audioCache.readThrough(key, async () => ({
                    mediaType: asset.mediaType,
                    data: Buffer.from(asset.data, "base64"),
                }));
                stored.push(`file:${key}`);
                audioPaths.set(audioPath, `file:${key}`);
            }
            fields[field.id] = Array.isArray(value) ? stored : stored[0];
        }
        record.fields = fields;
    }
    plan.assets = plan.assets.filter(({ path }) => !audioPaths.has(path));
}
