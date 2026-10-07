import type { LibrarySchema } from "../../types.js";
export const schema = (version: number): LibrarySchema => ({
    id: "test-language",
    version,
    namespace: "test",
    language: "x-test",
    metadata: { labels: { en: "Test Language" } },
    layers: [{ id: "units", metadata: { labels: { en: "Units" } } }],
});
