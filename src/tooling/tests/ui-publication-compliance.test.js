import test from "node:test";
import assert from "node:assert/strict";
import {
    existsSync,
    mkdtempSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const JAVASCRIPT_EXTENSIONS = new Set([".js", ".mjs"]);
const EXPORTED_UTILITY_PATTERNS = [
    /\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\bexport\s+(?:const|let|class)\s+([A-Za-z_$][\w$]*)\b/g,
];
const DECLARATION_PATTERNS = [
    /\b(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\b(?:export\s+)?(?:const|let|class)\s+([A-Za-z_$][\w$]*)\b/g,
];
const EXCLUDED_EXTERNAL_DIRECTORIES = new Set([
    ".git",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "tests",
]);

function walk(directoryPath, excludedDirectories = new Set()) {
    if (!existsSync(directoryPath)) return [];
    return readdirSync(directoryPath, { withFileTypes: true }).flatMap(
        (entry) => {
            const entryPath = join(directoryPath, entry.name);
            if (entry.isDirectory() && excludedDirectories.has(entry.name)) {
                return [];
            }
            return entry.isDirectory()
                ? walk(entryPath, excludedDirectories)
                : [entryPath];
        },
    );
}

function normalizePath(filePath) {
    return filePath.replace(/\\/g, "/");
}

function isExternalUiSource(filePath, sourceRoot) {
    const relativePath = normalizePath(relative(sourceRoot, filePath));
    const pathParts = relativePath.split("/");
    return (
        (normalizePath(resolve(sourceRoot)).endsWith("/ui") ||
            pathParts.includes("ui")) &&
        !pathParts.some((part) => EXCLUDED_EXTERNAL_DIRECTORIES.has(part))
    );
}

function collectExportedUtilityNames(reuseRoot) {
    const names = new Set();
    for (const filePath of walk(reuseRoot)) {
        if (!JAVASCRIPT_EXTENSIONS.has(extname(filePath))) continue;
        if (normalizePath(filePath).includes("/tests/")) continue;
        const source = stripComments(readFileSync(filePath, "utf8"));
        for (const pattern of EXPORTED_UTILITY_PATTERNS) {
            for (const match of source.matchAll(pattern)) names.add(match[1]);
        }
    }
    return names;
}

function isPageEntry(source) {
    return /\bexport\s+async\s+function\s+mount\b\s*\(/.test(
        stripComments(source),
    );
}

function stripComments(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|\s)\/\/.*$/gm, "$1");
}

function collectUiPublicationViolations({ sourceRoot, hostReuseRoot }) {
    const violations = [];
    const utilityNames = collectExportedUtilityNames(hostReuseRoot);
    const normalizedHostReuseRoot = normalizePath(resolve(hostReuseRoot));
    const isExternalModule = !normalizePath(resolve(sourceRoot)).endsWith(
        "/src",
    );

    const excludedDirectories = isExternalModule
        ? EXCLUDED_EXTERNAL_DIRECTORIES
        : new Set();
    for (const filePath of walk(sourceRoot, excludedDirectories)) {
        if (!JAVASCRIPT_EXTENSIONS.has(extname(filePath))) continue;
        if (normalizePath(filePath).includes("/tests/")) continue;
        if (isExternalModule && !isExternalUiSource(filePath, sourceRoot)) {
            continue;
        }
        const source = readFileSync(filePath, "utf8");
        const displayPath = normalizePath(relative(ROOT, filePath));
        const isHostUtility = normalizePath(resolve(filePath)).startsWith(
            `${normalizedHostReuseRoot}/`,
        );
        const executableSource = stripComments(source);

        if (isPageEntry(source)) {
            if (!/\bcreatePageComposer\s*\(/.test(executableSource)) {
                violations.push(
                    `${displayPath}: page does not call createPageComposer`,
                );
            }
            if (
                /\broot\s*\.(?:innerHTML|outerHTML|replaceChildren|append|appendChild)\b/.test(
                    executableSource,
                )
            ) {
                violations.push(
                    `${displayPath}: page writes directly to its mount root`,
                );
            }
        }

        const publishesForm =
            /<form\b/i.test(executableSource) ||
            /createElement\(\s*['"]form['"]\s*\)/.test(executableSource);
        const handlesSubmission =
            /addEventListener\(\s*['"]submit['"]/.test(executableSource) ||
            /\.onsubmit\s*=/.test(executableSource) ||
            /\bonSubmit\s*:/.test(executableSource);
        if (
            !isHostUtility &&
            (publishesForm || handlesSubmission) &&
            !/\bcreateFormBuilder\s*\(/.test(executableSource)
        ) {
            violations.push(
                `${displayPath}: form or submission does not use createFormBuilder`,
            );
        }

        if (isHostUtility || !isExternalModule) continue;
        const externalBypasses = [
            {
                pattern: /\bfetch\s*\(/,
                message: "uses fetch instead of the Cognis API client",
            },
            {
                pattern: /\.toLocale(?:Date|Time)?String\s*\(/,
                message: "formats time outside the Cognis timestamp utility",
            },
            {
                pattern:
                    /(?:^|[^\w.])(?:window\.)?(?:alert|confirm|prompt)\s*\(/,
                message:
                    "uses a native dialog instead of Cognis feedback utilities",
            },
            {
                pattern:
                    /document\.(?:head|body)\.append(?:Child)?\s*\(\s*[^)]*script/i,
                message: "loads scripts outside the Cognis resource loader",
            },
        ];
        for (const bypass of externalBypasses) {
            if (bypass.pattern.test(executableSource)) {
                violations.push(`${displayPath}: ${bypass.message}`);
            }
        }
        for (const pattern of DECLARATION_PATTERNS) {
            for (const match of executableSource.matchAll(pattern)) {
                if (!utilityNames.has(match[1])) continue;
                violations.push(
                    `${displayPath}: redeclares Cognis reuse utility ${match[1]}`,
                );
            }
        }
    }

    return violations;
}

test("core and external module pages use Cognis UI infrastructure", () => {
    const hostReuseRoot = resolve(ROOT, "src/ui/reuse");
    const scanRoots = [
        resolve(ROOT, "src"),
        resolve(
            process.env.COGNIS_EXTERNAL_MODULES_ROOT ??
                join(ROOT, "external-modules"),
        ),
    ].filter(existsSync);
    const violations = scanRoots.flatMap((sourceRoot) =>
        collectUiPublicationViolations({ sourceRoot, hostReuseRoot }),
    );

    assert.deepEqual(
        violations,
        [],
        `UI pages must use createPageComposer and Cognis reuse utilities:\n${violations.join("\n")}`,
    );
});

test("UI publication validation rejects composer and reuse workarounds", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "cognis-ui-compliance-"));
    const reuseRoot = join(fixtureRoot, "host-reuse");
    const moduleRoot = join(fixtureRoot, "external-module");
    mkdirSync(reuseRoot, { recursive: true });
    mkdirSync(join(moduleRoot, "ui", "app"), { recursive: true });
    writeFileSync(
        join(reuseRoot, "toast.js"),
        [
            "/**",
            " * Usage: export async function mount() {}",
            " */",
            "export function showToast() {}",
            "",
        ].join("\n"),
    );
    writeFileSync(
        join(moduleRoot, "ui", "app", "index.js"),
        [
            "export function showToast() {}",
            "// createPageComposer(root);",
            "export async function mount(root) {",
            "  root.innerHTML = '<main></main>';",
            "  root.innerHTML = '<form></form>';",
            "  fetch('/private-workaround');",
            "}",
            "",
        ].join("\n"),
    );
    writeFileSync(
        join(moduleRoot, "ui", "app", "mixed.js"),
        'export async function mount(root) { createPageComposer(root); root.append(document.createElement("main")); }\n',
    );
    writeFileSync(
        join(moduleRoot, "ui", "app", "documented.js"),
        [
            "/** Do not use root.innerHTML in a page entry. */",
            "export async function mount(root) {",
            "  createPageComposer(root);",
            "}",
            "",
        ].join("\n"),
    );
    mkdirSync(join(moduleRoot, "api"), { recursive: true });
    mkdirSync(join(moduleRoot, "node_modules", "vendor"), { recursive: true });
    writeFileSync(
        join(moduleRoot, "api", "index.js"),
        "export function showToast() { return fetch('/server-request'); }\n",
    );
    writeFileSync(
        join(moduleRoot, "node_modules", "vendor", "index.js"),
        "export function showToast() { return fetch('/vendor-request'); }\n",
    );

    try {
        const violations = collectUiPublicationViolations({
            sourceRoot: moduleRoot,
            hostReuseRoot: reuseRoot,
        });
        assert.ok(
            violations.some((violation) =>
                violation.includes("does not call createPageComposer"),
            ),
        );
        assert.equal(
            violations.some(
                (violation) =>
                    violation.includes("api/index.js") ||
                    violation.includes("node_modules"),
            ),
            false,
        );
        assert.equal(
            violations.some((violation) =>
                violation.includes("reuse utility mount"),
            ),
            false,
        );
        assert.equal(
            violations.some((violation) => violation.includes("documented.js")),
            false,
        );
        assert.ok(
            violations.some((violation) =>
                violation.includes("writes directly to its mount root"),
            ),
        );
        assert.ok(
            violations.some(
                (violation) =>
                    violation.includes("mixed.js") &&
                    violation.includes("writes directly to its mount root"),
            ),
        );
        assert.ok(
            violations.some((violation) =>
                violation.includes("reuse utility showToast"),
            ),
        );
        assert.ok(
            violations.some((violation) =>
                violation.includes("does not use createFormBuilder"),
            ),
        );
        assert.ok(
            violations.some((violation) =>
                violation.includes("Cognis API client"),
            ),
        );
    } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
    }
});
