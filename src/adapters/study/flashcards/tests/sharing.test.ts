import assert from "node:assert/strict";
import test from "node:test";
import {
    createCtx,
    CapabilityStore,
    GatewayRegistry,
    SHARE_FLOW_CATALOG,
} from "@cognis/core";
import {
    CoreStudyGateway,
    type StudyAdapterBootstrapCtx,
} from "../../../../gateways/study/gateway.js";
import {
    registerDeckSharing,
    canReadSharedDeck,
    DECK_READ,
} from "../sharing.js";
import type { StudyDeck } from "../service/types.js";

function fixture() {
    const system = createCtx();
    for (const contract of SHARE_FLOW_CATALOG)
        system.registerFlow({
            id: contract.id,
            stages: contract.stages.map((stage) => stage.id),
        });
    const capabilities = new CapabilityStore();
    let enabled = true;
    const ctx: StudyAdapterBootstrapCtx = {
        capabilities,
        gateway: new CoreStudyGateway(),
        gatewayRegistry: new GatewayRegistry(),
        flow: system.flow,
        adapterId: "flashcards",
        adapterRoot: "",
        registerRoute: () => {},
        registerStaticDir: () => {},
        registerNavbarPlugin: () => {},
        registerPageExtension: () => {},
        isAdapterEnabled: () => enabled,
    };
    const deck: StudyDeck = {
        id: "deck",
        ownerAccountId: "owner",
        name: "Shared Deck",
        language: "en",
        entryIds: [],
        notes: [{ id: "note", front: "Question", back: "Answer" }],
        cards: [],
        schemas: [],
        progress: {},
    };
    registerDeckSharing(ctx, {
        owned: async (owner, id) =>
            owner === "owner" && id === "deck" ? deck : undefined,
    });
    return {
        ctx,
        system,
        deck,
        disable: () => {
            enabled = false;
        },
    };
}

test("registered sharing flows authorize owners, resolve snapshots, and provide the adapter renderer", async () => {
    const { system, disable } = fixture();
    const minted = await system.flow.run("mint-share-token", {
        resourceType: "studyDeck",
        resourceId: "deck",
        ownerAccountId: "owner",
        grantedCapabilities: [DECK_READ],
    });
    assert.equal(
        (minted.stageResults["validate-resource"][0] as { valid: boolean })
            .valid,
        true,
    );
    assert.equal(
        (minted.stageResults["authorize-minter"][0] as { authorized: boolean })
            .authorized,
        true,
    );
    assert.equal(
        (
            minted.stageResults["validate-resource"][0] as {
                metadata: { contentUrl: string };
            }
        ).metadata.contentUrl,
        "/study/en/flashcards/deck",
    );
    const denied = await system.flow.run("mint-share-token", {
        resourceType: "studyDeck",
        resourceId: "deck",
        ownerAccountId: "other",
    });
    assert.equal(
        (denied.stageResults["validate-resource"][0] as { valid: boolean })
            .valid,
        false,
    );
    system.flow.extend(
        "resolve-share-token",
        "validate-token",
        { id: "test-token" },
        () => ({
            valid: true,
            tokenRecord: {
                resourceType: "studyDeck",
                resourceId: "deck",
                ownerAccountId: "owner",
            },
        }),
    );
    const resolved = await system.flow.run("resolve-share-token", {});
    assert.equal(
        (resolved.stageResults["resolve-resource"][0] as { resolved: boolean })
            .resolved,
        true,
    );
    assert.equal(
        (resolved.stageResults["check-access"][0] as { allowed: boolean })
            .allowed,
        true,
    );
    const rendered = await system.flow.run("construct-share-page", {
        resourceType: "studyDeck",
    });
    assert.match(
        (
            rendered.stageResults["resolve-resource-renderer"][0] as {
                mountScriptUrl: string;
            }
        ).mountScriptUrl,
        /adapters\/study\/flashcards\/app\/shared-deck/,
    );
    disable();
    const disabled = await system.flow.run("mint-share-token", {
        resourceType: "studyDeck",
        resourceId: "deck",
        ownerAccountId: "owner",
    });
    assert.equal(disabled.stageResults["validate-resource"][0], null);
});

test("guest access checks the live grant, resource, capability, expiry, and adapter availability", async () => {
    const { ctx, deck, disable } = fixture();
    let token = {
        resourceType: "studyDeck",
        resourceId: "deck",
        grantedCapabilities: [DECK_READ],
        expiresAt: "",
    };
    ctx.capabilities.contribute("share:resolveGuestId", () => "share-id");
    ctx.capabilities.contribute("share:getTokenById", async () => token);
    const actor = { accountId: "share:share-id:guest", role: "user" };
    assert.equal(await canReadSharedDeck(ctx, actor, deck), true);
    token = { ...token, resourceId: "other" };
    assert.equal(await canReadSharedDeck(ctx, actor, deck), false);
    token = { ...token, resourceId: "deck", expiresAt: "2000-01-01T00:00:00Z" };
    assert.equal(await canReadSharedDeck(ctx, actor, deck), false);
    token = { ...token, expiresAt: "", grantedCapabilities: [] };
    assert.equal(await canReadSharedDeck(ctx, actor, deck), false);
    disable();
    assert.equal(await canReadSharedDeck(ctx, actor, deck), false);
});

test("deck shares reject write permissions during creation and updates before token persistence", async () => {
    const { ctx, system } = fixture();
    const rejected = await system.flow.run("mint-share-token", {
        resourceType: "studyDeck",
        resourceId: "deck",
        ownerAccountId: "owner",
        grantedCapabilities: [DECK_READ],
        accessControls: { permissions: ["read", "write"] },
    });
    const validation = rejected.stageResults["validate-resource"][0] as {
        valid: boolean;
    };
    assert.equal(validation.valid, false);
    ctx.capabilities.contribute("share:getTokenById", async () => ({
        resourceType: "studyDeck",
        resourceId: "deck",
    }));
    let persisted = false;
    system.flow.extend(
        "update-share-token",
        "update-token",
        { id: "test-persist" },
        () => {
            persisted = true;
        },
    );
    await assert.rejects(
        () =>
            system.flow.run("update-share-token", {
                shareId: "share",
                accessControls: { permissions: ["write"] },
            }),
        /forbidden/,
    );
    assert.equal(persisted, false);
});
