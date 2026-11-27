const BASIC_HTML_ENTITY_MAP: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    "#x27": "'",
    "#8212": "—",
};

export function encodeBasicHtmlEntities(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
        if (character === "&") return "&amp;";
        if (character === "<") return "&lt;";
        if (character === ">") return "&gt;";
        if (character === '"') return "&quot;";
        return "&#x27;";
    });
}

export function decodeBasicHtmlEntities(value: string): string {
    return value.replace(
        /&(nbsp|amp|quot|apos|lt|gt|#x27|#8212);/gi,
        (match, entity: string) =>
            BASIC_HTML_ENTITY_MAP[entity.toLowerCase()] ?? match,
    );
}
