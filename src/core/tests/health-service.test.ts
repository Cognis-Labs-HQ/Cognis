import test from "node:test";
import assert from "node:assert/strict";
import { HealthService } from "../services/health-service.js";

test("health service returns uptime and lifecycle timestamps", async () => {
    const service = new HealthService();
    const now = new Date(Date.now() + 25);
    const status = await service.status(now);

    assert.equal(status.status, "ok");
    assert.ok(typeof status.startedAt === "string");
    assert.ok(typeof status.timestamp === "string");
    assert.ok(status.uptimeMs >= 0);
    assert.deepEqual(status.contributions, []);
});

test("health service includes component contributions", async () => {
    const service = new HealthService();
    service.contribute("module:jitsi-meet", async () => ({
        componentId: "jitsi-meet",
        componentType: "module",
        status: "warning",
        message: "Jitsi instance is not configured.",
    }));

    const status = await service.status();

    assert.equal(status.status, "warning");
    assert.deepEqual(status.contributions, [
        {
            componentId: "jitsi-meet",
            componentType: "module",
            status: "warning",
            message: "Jitsi instance is not configured.",
        },
    ]);
});
