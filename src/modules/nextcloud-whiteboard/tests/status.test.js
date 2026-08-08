import assert from "node:assert/strict";
import test from "node:test";
import { createWhiteboardStatusController } from "../ui/app/status.js";

test("whiteboard status controller exposes current render state", () => {
    const statusBox = { dataset: {}, title: "" };
    const previousDocument = globalThis.document;
    globalThis.document = {
        getElementById(id) {
            return id === "whiteboard-sync-status" ? statusBox : null;
        },
    };

    try {
        const controller = createWhiteboardStatusController({
            getI18n: () => ({ t: (key) => `translated:${key}` }),
            getIntegrationCanvasMode: () => false,
            getShareContext: () => null,
            showToast() {},
        });

        assert.deepEqual(controller.getSyncStatus(), {
            status: "idle",
            message: "",
        });

        controller.setSyncStatus("syncing", "whiteboard.status.syncing");
        assert.deepEqual(controller.getSyncStatus(), {
            status: "syncing",
            message: "translated:whiteboard.status.syncing",
        });
        assert.equal(statusBox.dataset.status, "syncing");
        assert.equal(statusBox.title, "translated:whiteboard.status.syncing");

        controller.setSyncStatusMessage("error", "Connection unavailable");
        assert.deepEqual(controller.getSyncStatus(), {
            status: "error",
            message: "Connection unavailable",
        });
        assert.equal(statusBox.dataset.status, "error");
        assert.equal(statusBox.title, "Connection unavailable");
    } finally {
        globalThis.document = previousDocument;
    }
});
