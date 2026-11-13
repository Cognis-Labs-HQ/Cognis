import { readFile } from "node:fs/promises";

/** Load declared XML labels with English fallback and explicit missing-key errors. */
export async function localizedLabels(
    root: URL,
    locale: string,
    prefix: string,
    required: readonly string[],
    read: (file: URL) => Promise<string> = (file) => readFile(file, "utf8"),
): Promise<Record<string, string>> {
    const load = async (language: string) => {
        const xml = await read(new URL(`${language}/strings.xml`, root));
        return Object.fromEntries(
            [...xml.matchAll(/<string name="([^"]+)">([^<]*)<\/string>/g)]
                .filter(
                    ([, key, value]) => key.startsWith(prefix) && value.trim(),
                )
                .map(([, key, value]) => [key.slice(prefix.length), value]),
        );
    };
    const english = await load("en");
    for (const key of required)
        if (!english[key])
            throw new Error(`missing_translation:${prefix}${key}`);
    const normalized = locale.toLowerCase().match(/^[a-z]{2,3}/)?.[0] ?? "en";
    if (normalized === "en") return english;
    try {
        return { ...english, ...(await load(normalized)) };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        return english;
    }
}
