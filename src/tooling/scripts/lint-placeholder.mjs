import { execSync } from "node:child_process";

try {
    execSync("npx prettier --check .", { stdio: "inherit" });
} catch {
    process.exit(1);
}
