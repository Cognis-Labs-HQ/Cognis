import { readFileSync } from "node:fs";

const { id, bootstrapRequires } = JSON.parse(
    readFileSync(new URL("./manifest.json", import.meta.url), "utf8"),
);
let ready = false;

export function createStudyAdapter() {
    return {
        adapterId: id,
        adapterName: "Test",
        isConfigured: () => ready,
        setConfig() {},
    };
}

export function bootstrapStudyAdapter(ctx) {
    for (const capability of bootstrapRequires) {
        if (!ctx.capabilities.get(capability))
            throw new Error("dependency_not_ready");
    }
    ctx.onAvailabilityChange((enabled) =>
        ctx.capabilities.contribute(`active:${id}`, enabled),
    );
    ctx.capabilities.contribute(`boot:${id}`, true);
    ready = true;
}
