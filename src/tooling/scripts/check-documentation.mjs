import { writeTerminalReport } from "../reuse/terminal-output.ts";
import { componentManifestFiles } from "../reuse/component-files.js";
import {
    changelogFiles,
    changelogLinkIssues,
    documentationBundleFiles,
    sourceReferenceIssues,
} from "../reuse/documentation/content.js";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
    validateComponent,
    validateChangelogChanges,
} from "../reuse/documentation/validate.js";

import {
    documentationTargets,
    documentationLinkIssues,
} from "../reuse/documentation/links.js";

const root = process.cwd();
const targets = documentationTargets(root);
const argumentsList = process.argv.slice(2);
const baseIndex = argumentsList.indexOf("--base");
const base = baseIndex >= 0 ? argumentsList[baseIndex + 1] : undefined;
const failures = componentManifestFiles(root).flatMap((manifest) =>
    validateComponent(
        manifest,
        manifest === resolve(root, "package.json") ? "src/docs" : "docs",
    ).map((issue) => `${manifest}: ${issue}`),
);

for (const path of documentationBundleFiles(root)) {
    failures.push(
        ...documentationLinkIssues(readFileSync(path, "utf8"), targets).map(
            (issue) => `${path}: ${issue}`,
        ),
        ...sourceReferenceIssues(readFileSync(path, "utf8"), root).map(
            (issue) => `${path}: ${issue}`,
        ),
    );
}

for (const path of changelogFiles(root)) {
    failures.push(
        ...changelogLinkIssues(readFileSync(path, "utf8")).map(
            (issue) => `${path}: ${issue}`,
        ),
    );
}

if (base) {
    const run = (args) => {
        const result = spawnSync("git", args, { encoding: "utf8" });
        if (result.error || result.status !== 0)
            throw new Error(
                `Documentation comparison failed: ${result.error?.message ?? result.stderr}`,
            );
        return result.stdout.trim();
    };
    const branchIndex = argumentsList.indexOf("--branch");
    const branch =
        branchIndex >= 0
            ? argumentsList[branchIndex + 1]
            : run(["branch", "--show-current"]);
    const added = run([
        "diff",
        "--diff-filter=A",
        "--name-only",
        run(["merge-base", base, "HEAD"]),
        "--",
    ])
        .split("\n")
        .filter(Boolean);
    const removed = run([
        "diff",
        "--diff-filter=D",
        "--name-only",
        run(["merge-base", base, "HEAD"]),
        "--",
    ])
        .split("\n")
        .filter(Boolean);
    failures.push(...validateChangelogChanges(added, branch, { removed }));
}

if (failures.length) {
    writeTerminalReport("stderr", failures.join("\n"));
    process.exitCode = 1;
} else
    writeTerminalReport(
        "stdout",
        "Component documentation bundles and requested branch comparison are valid.",
    );
