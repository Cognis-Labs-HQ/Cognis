import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../tooling/reuse/offline-client-fixture.js";

function clientFor(fixture) {
    return loadTestModule(
        new URL("../ui/email-client.js", import.meta.url),
        {
            ...fixture.imports,
            "/static/reuse/trusted-domains.js": {
                loadTrustedDomains: async () => ["example.org"],
            },
        },
        fixture.globals,
    );
}
const root = "/api/v1/notify/users/learner/emails";

test("email settings prepare without a visit, project queued changes and replay in order", async (context) => {
    const requests = [];
    let emails = [
        { email: "first@example.org", primary: true, verified: true },
        { email: "other@example.org", primary: false, verified: true },
    ];
    const fixture = createOfflineClientFixture(async (path, options = {}) => {
        requests.push({ path, method: options.method ?? "GET" });
        if (!options.method || options.method === "GET")
            return Response.json({ data: emails });
        if (options.method === "POST")
            emails.push({
                email: JSON.parse(options.body).email,
                primary: false,
                verified: false,
            });
        if (options.method === "PUT")
            emails = emails.map((entry) => ({
                ...entry,
                primary: path.includes(encodeURIComponent(entry.email)),
            }));
        if (options.method === "DELETE")
            emails = emails.filter(
                (entry) => !path.endsWith(encodeURIComponent(entry.email)),
            );
        return Response.json({ data: { updated: true } });
    });
    context.after(() => fixture.controller.abort());
    const client = clientFor(fixture);
    client.mountProvider(fixture.ctx);
    fixture.ctx.extendFlow(
        "authenticate-session",
        "resolve-session",
        { id: "test:emailSession" },
        () => ({ authenticated: true }),
    );
    await fixture.ctx.runFlow("authenticate-session", {});
    for (let i = 0; i < 30 && !requests.length; i++)
        await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    fixture.disconnect();
    assert.deepEqual(await client.emailTrustedDomains(), ["example.org"]);
    assert.equal(
        (await (await client.emailRequest(root)).json()).data.length,
        2,
    );
    const before = requests.length;
    await client.emailRequest(root, {
        method: "POST",
        body: JSON.stringify({ email: "new@example.org" }),
    });
    await client.emailRequest(root + "/other%40example.org/primary", {
        method: "PUT",
    });
    await client.emailRequest(root + "/first%40example.org", {
        method: "DELETE",
    });
    const pending = (await (await client.emailRequest(root)).json()).data;
    assert.deepEqual(
        pending.map(({ email }) => email),
        ["other@example.org", "new@example.org"],
    );
    assert.equal(pending[0].primary, true);
    assert.equal(pending[1].verified, false);
    assert.equal(requests.length, before);
    await assert.rejects(
        client.emailRequest(root + "/new%40example.org/verify", {
            method: "POST",
            body: '{"code":"123456"}',
        }),
        /offline_operation_unavailable/,
    );
    assert.equal((await fixture.outbox.pending("notify.emails")).length, 3);
    fixture.reconnect();
    assert.equal((await fixture.outbox.flush()).sent, 3);
    assert.deepEqual(
        requests
            .slice(before)
            .filter(({ method }) => method !== "GET")
            .map(({ method }) => method),
        ["POST", "PUT", "DELETE"],
    );
    fixture.disconnect();
    assert.deepEqual(
        (await (await client.emailRequest(root)).json()).data.map(
            ({ email }) => email,
        ),
        ["other@example.org", "new@example.org"],
    );
    fixture.changeAccount("another");
    await assert.rejects(client.emailRequest(root), /email_account_mismatch/);
    await assert.rejects(
        client.emailRequest("/api/v1/notify/users/another/emails"),
        /offline_read_unavailable/,
    );
});
