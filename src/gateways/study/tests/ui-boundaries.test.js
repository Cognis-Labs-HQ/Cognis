import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "../../../..");
const protectedClasses = JSON.parse(
    await readFile(
        path.join(repositoryRoot, "src/ui/styles/protected-classes.json"),
        "utf8",
    ),
);
const protectedReuseClasses = JSON.parse(
    await readFile(
        path.join(repositoryRoot, "src/ui/styles/protected-reuse-classes.json"),
        "utf8",
    ),
);
const protectedStyleClasses = [
    ...new Set([...protectedClasses, ...protectedReuseClasses]),
];
const componentRoots = ["src/adapters/study", "src/gateways/study"];

async function cssFiles(root) {
    const files = [];
    let entries;
    try {
        entries = await readdir(root, { withFileTypes: true });
    } catch (error) {
        if (error.code === "ENOENT") return files;
        throw error;
    }
    for (const entry of entries) {
        const location = path.join(root, entry.name);
        if (entry.isDirectory()) files.push(...(await cssFiles(location)));
        else if (entry.isFile() && entry.name.endsWith(".css"))
            files.push(location);
    }
    return files;
}

async function componentSourceFiles(root) {
    const files = [];
    let entries;
    try {
        entries = await readdir(root, { withFileTypes: true });
    } catch (error) {
        if (error.code === "ENOENT") return files;
        throw error;
    }
    for (const entry of entries) {
        const location = path.join(root, entry.name);
        if (entry.isDirectory())
            files.push(...(await componentSourceFiles(location)));
        else if (
            entry.isFile() &&
            (entry.name.endsWith(".js") || entry.name.endsWith(".ts")) &&
            !entry.name.endsWith(".test.js") &&
            !entry.name.endsWith(".test.ts")
        )
            files.push(location);
    }
    return files;
}

function selectorSubjects(source) {
    const withoutComments = source.replaceAll(/\/\*[\s\S]*?\*\//g, "");
    const subjects = [];
    let blockStart = 0;
    for (let index = 0; index < withoutComments.length; index += 1) {
        if (withoutComments[index] === "}") blockStart = index + 1;
        if (withoutComments[index] !== "{") continue;
        const selectorList = withoutComments.slice(blockStart, index).trim();
        blockStart = index + 1;
        if (!selectorList || selectorList.startsWith("@")) continue;
        for (const selector of selectorList.split(",")) {
            const subject = selector
                .trim()
                .split(/[\s>+~]+/)
                .at(-1);
            if (subject) subjects.push({ selector: selector.trim(), subject });
        }
    }
    return subjects;
}

test("Study styles preserve ownership of protected core or reusable UI classes", async () => {
    const violations = [];
    for (const relativeRoot of componentRoots) {
        for (const file of await cssFiles(
            path.join(repositoryRoot, relativeRoot),
        )) {
            const source = await readFile(file, "utf8");
            for (const { selector, subject } of selectorSubjects(source)) {
                const classes = [
                    ...subject.matchAll(/\.([a-zA-Z0-9_-]+)/g),
                ].map(([, className]) => className);
                const protectedClass = classes.find((className) =>
                    protectedStyleClasses.includes(className),
                );
                if (protectedClass) {
                    violations.push(
                        `${path.relative(repositoryRoot, file)}: ${selector} targets .${protectedClass}`,
                    );
                }
            }
        }
    }
    assert.deepEqual(violations, []);
});

test("Study uses public APIs for shell and reusable UI behavior", async () => {
    const violations = [];
    const traversalPattern =
        /\b(?:querySelector(?:All)?|closest|matches)\(\s*["'`]([^"'`]+)["'`]/g;
    for (const relativeRoot of componentRoots) {
        for (const file of await componentSourceFiles(
            path.join(repositoryRoot, relativeRoot),
        )) {
            const source = await readFile(file, "utf8");
            for (const [, selector] of source.matchAll(traversalPattern)) {
                const classes = [
                    ...selector.matchAll(/\.([a-zA-Z0-9_-]+)/g),
                ].map(([, className]) => className);
                const protectedClass = classes.find((className) =>
                    [
                        ...protectedStyleClasses,
                        "app-page__main",
                        "site-header",
                        "global-footer",
                    ].includes(className),
                );
                if (protectedClass)
                    violations.push(
                        `${path.relative(repositoryRoot, file)}: ${selector} traverses .${protectedClass}`,
                    );
            }
            traversalPattern.lastIndex = 0;
        }
    }
    assert.deepEqual(violations, []);
});
