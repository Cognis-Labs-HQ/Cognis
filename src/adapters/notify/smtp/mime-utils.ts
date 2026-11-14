import { decodeBasicHtmlEntities } from "./html-entities.js";

export function stripHtmlTags(html: string): string {
    let out = "";
    for (let cursor = 0; cursor < html.length; cursor++) {
        if (html[cursor] === "<") {
            const tagEnd = html.indexOf(">", cursor + 1);
            if (tagEnd === -1) break;
            const tagContent = html
                .slice(cursor + 1, tagEnd)
                .trim()
                .replace(/^\/+/, "")
                .toLowerCase();
            if (tagContent.startsWith("br")) {
                out += "\n";
            }
            cursor = tagEnd;
            continue;
        }
        out += html[cursor];
    }
    return decodeBasicHtmlEntities(out);
}

export function dotStuff(message: string): string {
    return message
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((line) => (line.startsWith(".") ? `.${line}` : line))
        .join("\r\n");
}

export function isTemporaryCode(code: number): boolean {
    return code >= 400 && code < 500;
}
