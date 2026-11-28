import { sourceFiles } from "../component-files.js";
import { readFileSync, lstatSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import structure from "./structure.json" with { type: "json" };
import { contentIssues } from "./content.js";
import { markdownLayout } from "./markdown-layout.js";

export const languages = Object.keys(structure);
export const documents = {
    readme: "README",
    usage: "USAGE",
    technical: "TECHNICAL",
};

export const coreDocuments = { ...documents, readme: "INFO" };

export function documentName(kind, language) {
    return `${documents[kind]}.${language}.md`;
}

export function validateMarkdown(markdown, kind, language) {
    const { prose, issues, hasCode } = markdownLayout(markdown);
    issues.push(...contentIssues(prose));
    const headings = [...prose.matchAll(/^(#{1,6})\s+(.+)$/gm)];
    if (
        headings.filter((heading) => heading[1] === "#").length !== 1 ||
        !/^# [^\n]+\n/.test(markdown) ||
        !headings[0]?.[2].trim()
    )
        issues.push("Start with exactly one H1");
    if ((headings[0]?.[2].length ?? 0) > 30)
        issues.push("H1 exceeds 30 characters");
    const actual = headings
        .filter((heading) => heading[1] === "##")
        .map((heading) => heading[2]);
    const expected = structure[language]?.[kind];
    if (!expected || JSON.stringify(actual) !== JSON.stringify(expected))
        issues.push(`Required H2 order: ${expected?.join(" / ")}`);
    for (let index = 1; index < headings.length; index++) {
        if (headings[index][1].length > headings[index - 1][1].length + 1)
            issues.push(`Skipped heading level: ${headings[index][2]}`);
    }
    const firstSection = prose.indexOf("\n## ");
    const introduction = prose
        .slice(prose.indexOf("\n") + 1, firstSection)
        .trim();
    if (
        !introduction ||
        /^(?:Code example|#{1,6}\s|[-*+]\s|\d+[.)]\s|[>|]| {4}|\t)/.test(
            introduction,
        )
    )
        issues.push("Missing introductory paragraph");
    for (let index = 1; index < headings.length; index++) {
        const heading = headings[index];
        const end =
            headings
                .slice(index + 1)
                .find((next) => next[1].length <= heading[1].length)?.index ??
            prose.length;
        const section = prose.slice(heading.index + heading[0].length, end);
        if (!section.replace(/^#{3,6} .+$/gm, "").trim())
            issues.push("Empty section");
    }
    if (
        /Describe the component-specific contract|Ersetzen Sie diese Anweisung|Ganti petunjuk ini|この指示を/.test(
            prose,
        ) ||
        /\b(TODO|TBD|FIXME|lorem ipsum)\b/i.test(prose) ||
        /<[^>]*(?:example|description)[^>]*>/i.test(
            prose.replace(/`[^`]+`/g, ""),
        )
    )
        issues.push("Unfilled documentation template");
    if (
        /\b(this PR|this pull request|this change|we (?:added|fixed)|now (?:supports|uses))\b/i.test(
            prose,
        ) ||
        /^#{2,6} (?:\d{4}-\d{2}-\d{2}|Added |Fixed |Changed |Updated )/m.test(
            prose,
        )
    )
        issues.push("Release history belongs in the branch changelog");
    if (
        kind === "readme" &&
        (hasCode ||
            /\/api\/v\d|ctx\.capabilities|\b(?:GET|POST|PUT|PATCH|DELETE)\s+\//.test(
                markdown,
            ))
    )
        issues.push(
            "README is for non-technical readers; move examples to USAGE and endpoints to TECHNICAL",
        );
    return issues;
}

export function validateComponent(manifestPath, documentsDirectory = "docs") {
    const root = dirname(manifestPath);
    const core = documentsDirectory === "src/docs";
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const issues = [];
    const pointers = manifest.documentation;
    if (
        !pointers ||
        JSON.stringify(Object.keys(pointers).sort()) !==
            JSON.stringify(Object.keys(documents).sort())
    )
        return [
            "Manifest must declare documentation.readme, usage and technical",
        ];
    for (const kind of Object.keys(documents)) {
        const name = core
            ? `${coreDocuments[kind]}.en.md`
            : documentName(kind, "en");
        if (pointers[kind] !== `${documentsDirectory}/${name}`) {
            issues.push(
                `Invalid documentation.${kind}: use ${documentsDirectory}/${name}`,
            );
            continue;
        }
        for (const language of languages) {
            const path = resolve(
                root,
                documentsDirectory,
                core
                    ? `${coreDocuments[kind]}.${language}.md`
                    : documentName(kind, language),
            );
            try {
                if (!lstatSync(path).isFile())
                    throw new Error("Not a regular file");
                issues.push(
                    ...validateMarkdown(
                        readFileSync(path, "utf8"),
                        kind,
                        language,
                    ).map((issue) => `${relative(root, path)}: ${issue}`),
                );
            } catch (error) {
                issues.push(`${relative(root, path)}: ${error.message}`);
            }
        }
    }
    if (core)
        return [
            ...issues,
            ...validateCoreDocumentation(resolve(root, documentsDirectory)),
        ];
    const allowed = new Set(
        Object.keys(documents).flatMap((kind) =>
            languages.map((language) => documentName(kind, language)),
        ),
    );
    try {
        for (const path of sourceFiles(resolve(root, documentsDirectory), {
            excludeDirectories: [],
        })) {
            if (
                /\.md$/i.test(path) &&
                !path.includes(`${sep}changelog${sep}`) &&
                !allowed.has(relative(resolve(root, documentsDirectory), path))
            )
                issues.push(
                    `Unregistered component document: ${relative(root, path)}`,
                );
        }
    } catch (error) {
        issues.push(`docs: ${error.message}`);
    }
    return issues;
}

export function validateCoreDocumentation(directory) {
    const issues = [];
    const paths = sourceFiles(directory, { excludeDirectories: [] }).filter(
        (path) =>
            /\.md$/i.test(path) && !path.includes(`${sep}changelog${sep}`),
    );
    const folders = new Set(paths.map(dirname));
    const names = coreDocuments;
    const allowed = new Set(
        Object.values(names).flatMap((name) =>
            languages.map((language) => `${name}.${language}.md`),
        ),
    );
    for (const path of paths)
        if (!allowed.has(path.split(sep).at(-1)))
            issues.push(
                `Core documentation must use a directory entry bundle: ${relative(directory, path)}`,
            );
    for (const folder of folders)
        for (const [kind, name] of Object.entries(names))
            for (const language of languages) {
                const path = resolve(folder, `${name}.${language}.md`);
                try {
                    issues.push(
                        ...validateMarkdown(
                            readFileSync(path, "utf8"),
                            kind,
                            language,
                        ).map(
                            (issue) => `${relative(directory, path)}: ${issue}`,
                        ),
                    );
                } catch (error) {
                    issues.push(
                        `${relative(directory, path)}: ${error.message}`,
                    );
                }
            }
    return issues;
}

export function validateChangelogChanges(paths, branch, { removed = [] } = {}) {
    const expectedBranch = branch.replace(/^copilot\//, "");
    const names = paths.filter((path) =>
        /(?:^|\/)docs\/changelog\/.*\.md$/.test(path),
    );
    const expected = languages
        .map(
            (language) => `src/docs/changelog/${expectedBranch}.${language}.md`,
        )
        .sort();
    const history = removed.filter((path) =>
        /(?:^|\/)docs\/changelog\/.*\.md$/.test(path),
    );
    const issues = history.length
        ? [`Do not delete existing changelog records: ${history.join(", ")}`]
        : [];
    return JSON.stringify([...names].sort()) === JSON.stringify(expected)
        ? issues
        : [
              ...issues,
              `A PR must add exactly one changelog set: ${expected.join(", ")}`,
          ];
}
