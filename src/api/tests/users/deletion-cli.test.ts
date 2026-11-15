import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
    executeRegisteredCommand,
    formatCommandOutput,
} from "../../../tooling/cli/index.ts";
import { UserDeletionError } from "../../../tooling/cli/user-deletion.ts";
import {
    createCliDeletionFixture,
    type DeletionFault,
} from "./reuse/cli-deletion.js";

const faults: DeletionFault[] = [
    "none",
    "before-persist",
    "after-persist",
    "lost-response",
    "lost-request",
    "rejected",
    "malformed-response",
];

for (const fault of faults) {
    test(`real CLI dispatcher and route retain truthful deletion outcome: ${fault}`, async (context) => {
        const fixture = await createCliDeletionFixture(fault);
        const originalFetch = globalThis.fetch;
        globalThis.fetch = fixture.fetch;
        context.after(async () => {
            globalThis.fetch = originalFetch;
            await fixture.dispose();
        });
        const execute = () =>
            executeRegisteredCommand("user:delete", ["target"], {
                apiBaseUrl: "https://cli-audit.invalid",
                getApiToken: async () => "fixture-only",
            });
        if (fault === "none") {
            const result = await execute();
            assert.deepEqual(result, {
                username: "target",
                data: { deleted: true },
            });
            assert.match(
                formatCommandOutput("user:delete", result),
                /User Deleted/,
            );
        } else {
            await assert.rejects(execute, (error: unknown) => {
                assert.ok(error instanceof UserDeletionError);
                assert.equal(
                    error.outcome,
                    fault === "after-persist"
                        ? "committed"
                        : fault === "rejected"
                          ? "rejected"
                          : "unknown",
                );
                assert.doesNotMatch(error.message, /private .* details/);
                return true;
            });
        }
        const observed = await fixture.snapshot();
        const retained = [
            "before-persist",
            "lost-request",
            "rejected",
        ].includes(fault);
        assert.equal(observed.exists, retained);
        assert.equal(observed.deletes, retained ? 0 : 1);
        assert.deepEqual(
            observed.requests.map(({ method, path }) => ({ method, path })),
            [
                { method: "GET", path: "/api/v1/users/target/info" },
                { method: "DELETE", path: "/api/v1/users/target" },
            ],
        );
        assert.equal(
            observed.recoveryCount,
            ["before-persist", "after-persist"].includes(fault) ? 1 : 0,
        );
        if (!retained) {
            await assert.rejects(execute, /not found/);
            assert.equal(
                (await fixture.snapshot()).requests.filter(
                    ({ method }) => method === "DELETE",
                ).length,
                1,
            );
            assert.equal((await fixture.snapshot()).deletes, 1);
        }
    });
}

const processCases: Array<{
    fault: DeletionFault;
    locale: string;
    responseStatus?: number;
    verbose?: boolean;
}> = [
    ...faults.map((fault) => ({ fault, locale: "en" })),
    ...["de", "id", "ja"].map((locale) => ({
        fault: "after-persist" as const,
        locale,
    })),
];
for (const responseStatus of [200, 201, 202, 207]) {
    for (const verbose of [false, true])
        processCases.push({
            fault: "none",
            locale: "en",
            responseStatus,
            verbose,
        });
}
for (const { fault, locale, responseStatus, verbose } of processCases) {
    test(`actual CLI process uses nonzero failure and no retry: ${fault}/${locale}/${responseStatus ?? "route"}/${Boolean(verbose)}`, async () => {
        const directory = await mkdtemp(
            path.join(tmpdir(), "cognis-deletion-"),
        );
        const token = path.join(directory, "fixture-token");
        const report = path.join(directory, "report.json");
        await writeFile(token, "fixture-only");
        try {
            const child = spawn(
                process.execPath,
                [
                    "--import",
                    "tsx",
                    "--import",
                    "./src/api/tests/users/reuse/cli-deletion-process.ts",
                    "./src/tooling/cli/index.ts",
                    "user:delete",
                    "target",
                    ...(verbose ? ["--verbose"] : []),
                ],
                {
                    env: {
                        ...process.env,
                        LC_ALL: locale,
                        COGNIS_API_URL: "https://cli-audit.invalid",
                        COGNIS_CLI_TOKEN_PATH: token,
                        COGNIS_DELETION_FAULT: fault,
                        COGNIS_DELETION_REPORT: report,
                        COGNIS_DELETION_RESPONSE_STATUS:
                            responseStatus === undefined
                                ? ""
                                : String(responseStatus),
                    },
                    stdio: ["ignore", "pipe", "pipe"],
                },
            );
            let stdout = "";
            let stderr = "";
            child.stdout.on("data", (chunk) => {
                stdout += String(chunk);
            });
            child.stderr.on("data", (chunk) => {
                stderr += String(chunk);
            });
            const code = await new Promise<number | null>((resolve, reject) => {
                child.once("error", reject);
                child.once("close", resolve);
            });
            const success =
                fault === "none" &&
                (responseStatus === undefined || responseStatus === 200);
            assert.equal(code, success ? 0 : 1, stderr);
            if (success) {
                if (verbose)
                    assert.equal(JSON.parse(stdout).data.deleted, true);
                else assert.match(stdout, /User Deleted/);
            } else {
                assert.equal(stdout, "");
                const localizedPartial: Record<string, RegExp> = {
                    de: /Das Konto wurde gelöscht/,
                    id: /Akun telah dihapus/,
                    ja: /アカウントは削除されました/,
                };
                assert.match(
                    stderr,
                    localizedPartial[locale] ??
                        (fault === "after-persist"
                            ? /Account deleted, but cleanup is incomplete/
                            : fault === "rejected"
                              ? /Deletion was rejected/
                              : /Deletion outcome unknown/),
                );
            }
            assert.doesNotMatch(stderr, /private .* details/);
            const observed = JSON.parse(await readFile(report, "utf8"));
            assert.equal(
                observed.requests.filter(
                    (entry: { method: string }) => entry.method === "DELETE",
                ).length,
                1,
            );
            assert.equal(
                observed.deletes,
                ["before-persist", "lost-request", "rejected"].includes(fault)
                    ? 0
                    : 1,
            );
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });
}
