import { readFileSync } from "node:fs";

const { name } = JSON.parse(
    readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);

export function createStudyAdapter() {
    return {
        adapterId: name,
        adapterName: name,
        getConfig: () => ({}),
        setConfig: (value) => value,
        isConfigured: () => true,
    };
}
