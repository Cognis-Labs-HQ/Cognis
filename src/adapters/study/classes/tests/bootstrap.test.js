import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { bootstrapStudyAdapter } from "../index.ts";

test("study/classes registers classroom assets before DB bootstrap can skip", async () => {
    const staticDirRegistrations = [];

    await bootstrapStudyAdapter({
        gateway: {},
        adapterId: "classes",
        adapterRoot: path.resolve(
            process.cwd(),
            "src",
            "adapters",
            "study",
            "classes",
        ),
        capabilities: {
            get() {
                return undefined;
            },
            contribute() {},
        },
        gatewayRegistry: {},
        registerRoute() {},
        registerStaticDir() {
            // Study/classes bootstrap should not register gateway static dirs.
        },
        registerAdapterStaticDir(gatewayId, adapterId, absoluteDir) {
            staticDirRegistrations.push({
                gatewayId,
                adapterId,
                absoluteDir,
            });
        },
        registerNavbarPlugin() {},
        registerPageExtension() {},
        isAdapterEnabled() {
            return true;
        },
    });

    assert.deepEqual(staticDirRegistrations, [
        {
            gatewayId: "study",
            adapterId: "classes",
            absoluteDir: path.resolve(
                process.cwd(),
                "src",
                "adapters",
                "study",
                "classes",
                "ui",
            ),
        },
    ]);
});
