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
    return value.replace(/[&<>"']/g, (char) => {
        if (char === "&") return "&amp;";
        if (char === "<") return "&lt;";
        if (char === ">") return "&gt;";
        if (char === '"') return "&quot;";
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
