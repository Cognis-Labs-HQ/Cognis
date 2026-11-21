import { readFileSync } from "node:fs";

export function resolveCliText(
    key: string,
    catalogs: {
        preferred: Record<string, string>;
        english: Record<string, string>;
    },
    values: Record<string, string> = {},
): string {
    const template =
        catalogs.preferred[key]?.trim() || catalogs.english[key]?.trim();
    if (!template) throw new Error(`Missing translation: ${key}`);
    return template.replace(
        /\{(\w+)\}/g,
        (match, name: string) => values[name] ?? match,
    );
}

function readCatalog(locale: string): Record<string, string> {
    const source = readFileSync(
        new URL(`../languages/${locale}/strings.xml`, import.meta.url),
        "utf8",
    );
    return Object.fromEntries(
        Array.from(
            source.matchAll(/<string name="([^"]+)">([^<]*)<\/string>/g),
            (match) => [match[1], match[2]],
        ),
    );
}

const english = readCatalog("en");
const language = (
    process.env.LC_ALL ||
    process.env.LC_MESSAGES ||
    process.env.LANG ||
    "en"
).split(/[_.-]/)[0];
const preferred = ["de", "id", "ja"].includes(language)
    ? readCatalog(language)
    : english;

export function cliText(
    key: string,
    values: Record<string, string> = {},
): string {
    return resolveCliText(
        `cli.terminal.${key}`,
        { preferred, english },
        values,
    );
}
