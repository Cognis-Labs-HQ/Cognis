import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { discoverTestFiles } from "../../core/index.js";

const roots = [
    path.resolve(process.cwd(), "src"),
    path.resolve(
        process.env.COGNIS_EXTERNAL_MODULES_ROOT ??
            path.join(process.cwd(), "external-modules"),
    ),
].filter(existsSync);
const testFiles = (
    await Promise.all(roots.map((root) => discoverTestFiles(root)))
).flat();

const child = spawn(
    process.execPath,
    ["--import", "tsx", "--test", ...testFiles],
    { cwd: process.cwd(), stdio: "inherit" },
);
process.exitCode = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
});
