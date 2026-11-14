import { mkdtempSync } from "node:fs";
import path from "node:path";

const directory = process.env.COGNIS_TEST_TOKEN_DIRECTORY;
if (!directory) throw new Error("test_token_directory_required");
const workerDirectory = mkdtempSync(path.join(directory, "worker-"));
process.env.COGNIS_ACCESS_TOKEN_STORE_PATH = path.join(
    workerDirectory,
    "access-tokens.json",
);
