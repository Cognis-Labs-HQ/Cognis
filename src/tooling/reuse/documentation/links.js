import { readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { componentManifestFiles } from "../component-files.js";
import { documentationBundleFiles } from "./content.js";

export function documentationTargets(root) {
    const targets = new Set(["changelog"]);
    const core = resolve(root, "src/docs") + sep;
    for (const path of documentationBundleFiles(root)) {
        if (path.startsWith(core) && path.endsWith(`${sep}INFO.en.md`)) {
            targets.add(
                relative(resolve(root, "src/docs"), dirname(path))
                    .split(sep)
                    .join("/") || "index",
            );
        }
    }
    for (const path of componentManifestFiles(root)) {
        if (path === resolve(root, "package.json")) continue;
        const manifest = JSON.parse(readFileSync(path, "utf8"));
        if (!manifest.documentation) continue;
        const owner = relative(resolve(root, "src"), dirname(path))
            .split(sep)
            .join("/");
        targets.add(
            path.endsWith("package.json") &&
                manifest.name?.startsWith("@cognis/")
                ? `components/${owner}`
                : owner,
        );
    }
    return targets;
}

export function documentationLinkIssues(markdown, targets) {
    const issues = [];
    for (const match of markdown.matchAll(
        /(?:\]\(|href=["']|^\s*\[[^\]]+\]:\s*)(\/docs(?:\/[^\s)"'<>]*)?)/gm,
    )) {
        if (/%(?![0-9a-f]{2})/i.test(match[1])) {
            issues.push(`Invalid documentation URL: ${match[1]}`);
            continue;
        }
        const url = new URL(match[1], "https://docs.test");
        let parts = decodeURIComponent(url.pathname)
            .split("/")
            .filter(Boolean)
            .slice(1);
        if (parts[0] === "latest" || /^\d+\.\d+\.\d+$/.test(parts[0]))
            parts = parts.slice(1);
        if (["info", "usage", "technical"].includes(parts.at(-1)))
            parts = parts.slice(0, -1);
        const slug = parts.join("/") || "index";
        if (!targets.has(slug))
            issues.push(`Unknown documentation topic: ${match[1]}`);
    }
    return issues;
}
