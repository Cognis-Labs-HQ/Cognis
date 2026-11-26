import { readFile } from "node:fs/promises";

const XML_ENTITIES: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
};

export function notificationMessages(
    xml: string,
    prefix: string,
    englishXml = xml,
    values: Record<string, string> = {},
): { subject: string; body: string } {
    const strings = (source: string) =>
        new Map(
            Array.from(
                source.matchAll(/<string name="([^"]+)">([^<]*)<\/string>/g),
                (match) => [match[1], match[2]],
            ),
        );
    const preferred = strings(xml);
    const english = xml === englishXml ? preferred : strings(englishXml);
    const get = (suffix: string) => {
        const key = `adapter.study.library.notification_${prefix}_${suffix}`;
        const value = preferred.get(key)?.trim()
            ? preferred.get(key)
            : english.get(key);
        if (!value?.trim())
            throw new Error(`missing_notification_translation:${key}`);
        return value
            .replace(
                /&(amp|lt|gt|quot|apos);/g,
                (entity) => XML_ENTITIES[entity],
            )
            .replace(
                /\{\{ (\w+) \}\}/g,
                (token, name: string) => values[name] ?? token,
            );
    };
    return { subject: get("subject"), body: get("body") };
}

export function createNotificationMessages(): (
    prefix: string,
    values?: Record<string, string>,
) => Promise<Record<string, { subject: string; body: string }>> {
    const catalogs = new Map<string, Promise<string>>();
    const catalog = (locale: string) => {
        let pending = catalogs.get(locale);
        if (!pending) {
            pending = readFile(
                new URL(
                    `../ui/languages/${locale}/strings.xml`,
                    import.meta.url,
                ),
                "utf8",
            ).catch((error) => {
                catalogs.delete(locale);
                throw error;
            });
            catalogs.set(locale, pending);
        }
        return pending;
    };
    return async (prefix, values = {}) => {
        const english = await catalog("en");
        return Object.fromEntries(
            await Promise.all(
                ["en", "de", "ja", "id"].map(async (locale) => [
                    locale,
                    notificationMessages(
                        await catalog(locale),
                        prefix,
                        english,
                        values,
                    ),
                ]),
            ),
        );
    };
}
