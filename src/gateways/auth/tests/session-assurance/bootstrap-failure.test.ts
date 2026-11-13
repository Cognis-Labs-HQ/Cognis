import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { GatewayService } from "@cognis/core";
import { revokeAccessTokensForSubject } from "../../access-tokens.js";
import { createLoginFixture } from "./fixture.js";

test("real host-discovered TFA import failure denies Auth without activation or token", async (t) => {
    const directory = await mkdtemp(path.join(tmpdir(), "auth-host-failure-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    await mkdir(path.join(directory, "tfa"));
    await writeFile(
        path.join(directory, "tfa", "manifest.json"),
        JSON.stringify({ id: "tfa", name: "TFA", version: "1" }),
    );
    const fixture = await createLoginFixture();
    await new GatewayService(fixture.gatewayRegistry).bootstrap(directory, {
        gatewayRegistry: fixture.gatewayRegistry,
        capabilities: fixture.capabilities,
        flow: fixture.root.flow,
    });
    assert.equal(fixture.gatewayRegistry.get("tfa"), undefined);
    assert.equal(fixture.gatewayRegistry.hasBootstrapFailure("tfa"), true);
    assert.equal((await fixture.login()).outcome, "tfa_unavailable");
    assert.equal(fixture.state.activations, 0);
    assert.equal(revokeAccessTokensForSubject("assurance-user"), 0);
});

test("intentional disable permits login but re-enable retains failed initialization denial", async () => {
    const fixture = await createLoginFixture();
    fixture.gatewayRegistry.register({ id: "tfa", name: "TFA", version: "1" });
    fixture.gatewayRegistry.markBootstrapFailure("tfa");
    await fixture.gatewayRegistry.disable("tfa");
    assert.equal((await fixture.login()).outcome, "success");
    assert.equal(revokeAccessTokensForSubject("assurance-user"), 1);
    assert.equal(fixture.gatewayRegistry.hasBootstrapFailure("tfa"), true);
    await fixture.gatewayRegistry.enable("tfa");
    const before = fixture.state.activations;
    assert.equal((await fixture.login()).outcome, "tfa_unavailable");
    assert.equal(fixture.state.activations, before);
    assert.equal(revokeAccessTokensForSubject("assurance-user"), 0);
});
