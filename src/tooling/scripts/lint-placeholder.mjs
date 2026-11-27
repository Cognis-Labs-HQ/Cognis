import { execSync as executorSync } from "node:child_process";

try {
    executorSync("npx prettier --check .", { stdio: "inherit" });
} catch {
    process.exit(1);
}
