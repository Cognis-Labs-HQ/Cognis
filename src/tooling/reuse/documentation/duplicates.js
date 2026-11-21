import { readFileSync } from "node:fs";

export function duplicateTechnicalParagraphs(paths) {
    const owners = new Map();
    const issues = [];
    for (const path of paths) {
        const language = path.match(/\.(en|de|id|ja)\.md$/)?.[1] ?? "en";
        let fence = "";
        for (const paragraph of readFileSync(path, "utf8").split("\n\n")) {
            const code = Boolean(fence) || /```|~~~/.test(paragraph);
            for (const line of paragraph.split("\n")) {
                const marker = line.match(/^\s*(`{3,}|~{3,})/);
                if (marker && !fence) fence = marker[1];
                else if (
                    marker &&
                    marker[1][0] === fence[0] &&
                    marker[1].length >= fence.length
                )
                    fence = "";
            }
            const normalized = paragraph.replace(/\s+/g, " ").trim();
            if (
                code ||
                normalized.length < 220 ||
                /^(?:#|\||- |\d+\.)/.test(paragraph)
            )
                continue;
            const key = `${language}:${normalized}`;
            const owner = owners.get(key);
            if (owner)
                issues.push(
                    `${path}: duplicated technical paragraph owned by ${owner}`,
                );
            else owners.set(key, path);
        }
    }
    return issues;
}
