import assert from "node:assert/strict";
import { launchCli, ptyOptions } from "./fixtures/process.ts";
import test from "node:test";
import { resolveCliText } from "../reuse/locale.ts";

test(
    "wizard suspends progress, resumes during request, and reserves stdout for final results",
    ptyOptions,
    async () => {
        const run = await launchCli(["user:disable"], true, {
            COGNIS_FIXTURE_DELAY: "11000",
        });
        try {
            await run.waitFor(() => run.stderr().includes("username ("));
            await new Promise((resolve) => setTimeout(resolve, 10_500));
            assert.doesNotMatch(run.stderr(), /still working/);
            assert.equal(run.stdout(), "");
            run.send("fixture-target\n");
            await run.waitFor(() => run.stderr().includes("still working"));
            assert.deepEqual(
                await run
                    .outcome()
                    .then(({ code, restored }) => ({ code, restored })),
                { code: 0, restored: true },
            );
            assert.match(run.stdout(), /User Disabled/);
            assert.match(run.stderr(), /fixture-target/);
            assert.doesNotMatch(run.stdout(), /wizard|username \(|working/);
            assert.equal(
                (await run.requests()).filter(
                    (entry) => entry.method === "POST",
                ).length,
                1,
            );
        } finally {
            await run.dispose();
        }
    },
);

for (const cancellation of ["eof", "keyboard", "signal"]) {
    test(
        `wizard ${cancellation} fails without mutation and restores terminal`,
        ptyOptions,
        async () => {
            const run = await launchCli(["user:disable"]);
            try {
                await run.waitFor(() => run.stderr().includes("username ("));
                if (cancellation === "signal") run.signal();
                else run.send(cancellation === "eof" ? "\u0004" : "\u0003");
                const result = await run.outcome();
                assert.equal(result.code, 1);
                assert.equal(result.restored, true);
                assert.equal(run.stdout(), "");
                assert.match(
                    run.stderr(),
                    cancellation === "eof" ? /Input ended/ : /cancelled/,
                );
                assert.match(
                    run.stderr(),
                    /\n(?:Input ended|Command cancelled)/,
                );
                assert.equal(
                    (await run.requests()).some(
                        (entry) => entry.method !== "GET",
                    ),
                    false,
                );
            } finally {
                await run.dispose();
            }
        },
    );
}

test(
    "wizard hides password input and preserves its request value",
    ptyOptions,
    async () => {
        const run = await launchCli(["user:set-password"]);
        try {
            await run.waitFor(() => run.stderr().includes("username ("));
            run.send("fixture-target\n");
            await run.waitFor(() => run.stderr().includes("password ("));
            run.send("fixture-secret-value\n");
            assert.equal((await run.outcome()).code, 0);
            assert.doesNotMatch(
                run.stdout() + run.stderr(),
                /fixture-secret-value/,
            );
            assert.deepEqual(
                (await run.requests()).find((entry) =>
                    entry.path.endsWith("/password"),
                )?.body,
                { password: "fixture-secret-value" },
            );
        } finally {
            await run.dispose();
        }
    },
);

test(
    "noninteractive missing input fails promptly with guidance and no mutation",
    { timeout: 5000 },
    async () => {
        const run = await launchCli(["user:disable"], false);
        try {
            assert.equal((await run.outcome()).code, 1);
            assert.equal(run.stdout(), "");
            assert.match(run.stderr(), /requires a terminal.*--help/);
            assert.equal(
                (await run.requests()).some((entry) => entry.method !== "GET"),
                false,
            );
        } finally {
            await run.dispose();
        }
    },
);

test(
    "noninteractive explicit input retains genuine HTTP failure without retry",
    { timeout: 5000 },
    async () => {
        const run = await launchCli(["user:disable", "fixture-target"], false, {
            COGNIS_FIXTURE_FAILURE: "1",
        });
        try {
            assert.equal((await run.outcome()).code, 1);
            assert.equal(run.stdout(), "");
            assert.match(run.stderr(), /400|Fixture refused/);
            assert.equal(
                (await run.requests()).filter(
                    (entry) => entry.method === "POST",
                ).length,
                1,
            );
        } finally {
            await run.dispose();
        }
    },
);

test("terminal translations fall back to English and fail when both values are empty", () => {
    assert.equal(
        resolveCliText(
            "field",
            { preferred: { field: " " }, english: { field: "Value {field}" } },
            { field: "{opaque}" },
        ),
        "Value {opaque}",
    );
    assert.throws(
        () =>
            resolveCliText("field", { preferred: {}, english: { field: "" } }),
        /Missing translation/,
    );
});

for (const [locale, message] of [
    ["en", "Interactive input requires"],
    ["de", "Interaktive Eingaben benötigen"],
    ["id", "Masukan interaktif memerlukan"],
    ["ja", "対話入力には"],
]) {
    test(
        `terminal loads ${locale} XML messages`,
        { timeout: 5000 },
        async () => {
            const run = await launchCli(["user:disable"], false, {
                LC_ALL: locale,
            });
            try {
                assert.equal((await run.outcome()).code, 1);
                assert.ok(run.stderr().includes(message));
            } finally {
                await run.dispose();
            }
        },
    );
}
