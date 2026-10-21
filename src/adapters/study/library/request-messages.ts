import type { LibraryPushRequest } from "./types.js";

const XML_ENTITIES: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
};

export function requestMessages(
    xml: string,
    status: LibraryPushRequest["status"],
    englishXml = xml,
): { subject: string; body: string } {
    const strings = (source: string) =>
        new Map(
            [
                ...source.matchAll(/<string name="([^"]+)">([^<]*)<\/string>/g),
            ].map((match) => [match[1], match[2]]),
        );
    const preferred = strings(xml);
    const english = xml === englishXml ? preferred : strings(englishXml);
    const get = (suffix: string) => {
        const key = `adapter.study.library.notification_${status}_${suffix}`;
        const value = preferred.get(key)?.trim()
            ? preferred.get(key)
            : english.get(key);
        if (!value?.trim()) throw new Error("missing_request_translation");
        return value.replace(
            /&(amp|lt|gt|quot|apos);/g,
            (entity) => XML_ENTITIES[entity],
        );
    };
    return { subject: get("subject"), body: get("body") };
}
