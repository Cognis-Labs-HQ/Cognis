import { componentManifestFiles } from "../reuse/component-files.js";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
    validateComponent,
    validateChangelogChanges,
} from "../reuse/documentation/validate.js";

const root = process.cwd();
const argumentsList = process.argv.slice(2);
const baseIndex = argumentsList.indexOf("--base");
const base = baseIndex >= 0 ? argumentsList[baseIndex + 1] : undefined;
const failures = componentManifestFiles(root).flatMap((manifest) =>
    validateComponent(
        manifest,
        manifest === resolve(root, "package.json") ? "src/docs" : "docs",
    ).map((issue) => `${manifest}: ${issue}`),
);

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
    console.error(failures.join("\n"));
    process.exitCode = 1;
} else
    console.log(
        "Component documentation bundles and requested branch comparison are valid.",
    );
