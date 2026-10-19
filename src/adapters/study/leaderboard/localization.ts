import { readFile } from "node:fs/promises";

const REQUIRED = [
    "rank",
    "participant",
    "score",
    "ties",
    "movement",
    "updated",
    "caption",
    "medal",
    "rank_word",
    "tied_word",
    "you",
    "anonymous",
    "gold",
    "silver",
    "bronze",
];

export async function tableLabels(
    locale: string,
    read: (file: URL) => Promise<string> = (file) => readFile(file, "utf8"),
): Promise<Record<string, string>> {
    const normalized = locale.toLowerCase().match(/^[a-z]{2,3}/)?.[0] ?? "en";
    const load = async (language: string) => {
        const xml = await read(
            new URL(`./ui/languages/${language}/strings.xml`, import.meta.url),
        );
        return Object.fromEntries(
            [
                ...xml.matchAll(
                    /<string name="gateway\.study\.leaderboard_([^"]+)">([^<]*)<\/string>/g,
                ),
            ]
                .filter(([, , value]) => value.trim())
                .map(([, key, value]) => [key, value]),
        );
    };
    const english = await load("en");
    for (const key of REQUIRED)
        if (!english[key])
            throw new Error(
                `missing_translation:gateway.study.leaderboard_${key}`,
            );
    if (normalized === "en") return english;
    let preferred: Record<string, string>;
    try {
        preferred = await load(normalized);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        preferred = {};
    }
    return { ...english, ...preferred };
}
