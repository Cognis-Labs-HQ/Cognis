import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { installModule } from "../../app/modules/api.js";

function mockStorage(context) {
    const previous = Object.getOwnPropertyDescriptor(
        globalThis,
        "localStorage",
    );
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: { getItem: () => "" },
    });
    context.after(() => {
        if (previous)
            Object.defineProperty(globalThis, "localStorage", previous);
        else delete globalThis.localStorage;
    });
}

test("module installation waits for the server result during a progressing large download", async (context) => {
    context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
    mockStorage(context);
    let polls = 0;
    context.mock.method(globalThis, "fetch", async (_url, options) => {
        if (options.method === "POST")
            return Response.json({ data: { jobId: "job-1" } });
        polls += 1;
        return Response.json({
            data:
                polls === 1
                    ? { status: "pending" }
                    : {
                          status: "succeeded",
                          data: { id: "study-language-ja" },
                      },
        });
    });
    const result = installModule({
        cloneUrl: "https://github.com/example/module.git",
    });
    await setImmediate();
    context.mock.timers.tick(130_000);
    await setImmediate();
    assert.equal(polls, 1);
    context.mock.timers.tick(500);
    assert.deepEqual(await result, { id: "study-language-ja" });
});

for (const code of ["module_install_timeout", "github_connection_timeout"]) {
    test(`module installation preserves the server's ${code} diagnosis`, async (context) => {
        context.mock.timers.enable({ apis: ["setTimeout"] });
        mockStorage(context);
        context.mock.method(globalThis, "fetch", async (_url, options) =>
            options.method === "POST"
                ? Response.json({ data: { jobId: "job-2" } })
                : Response.json(
                      {
                          error: {
                              code,
                              message: "Module installation failed.",
                          },
                      },
                      { status: 422 },
                  ),
        );
        const result = installModule({
            cloneUrl: "https://github.com/example/module.git",
        });
        const rejected = assert.rejects(result, { code });
        await setImmediate();
        context.mock.timers.tick(500);
        await rejected;
    });
}
