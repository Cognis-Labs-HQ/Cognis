import test from "node:test";
import assert from "node:assert/strict";
import { resolveShareDelegatedAccess } from "../reuse/share-guest.js";

const token = {
    resourceType: "meeting",
    resourceId: "meeting-1",
    grantedCapabilities: ["meeting:join"],
};

function delegationResult(overrides = {}) {
    return {
        flowId: "resolve-share-delegated-access",
        stageResults: {
            "resolve-delegation": [
                {
                    authorized: true,
                    sourceResourceType: "meeting",
                    sourceResourceId: "meeting-1",
                    sourceCapability: "meeting:join",
                    resourceType: "whiteboard",
                    resourceId: "board-1",
                    allowedCapabilities: [
                        "whiteboard:read",
                        "whiteboard:write",
                    ],
                    ...overrides,
                },
            ],
        },
    };
}

test("share delegates guest access through a resource-owned flow hook", async () => {
    let flowInput;
    const access = await resolveShareDelegatedAccess({
        claims: { sub: "share:share-1:guest-1" },
        resourceType: "whiteboard",
        resourceId: "board-1",
        requiredCapability: "whiteboard:read",
        getTokenById: async () => token,
        getGuestProfile: async () => ({ displayName: "Guest One" }),
        runDelegationFlow: async (input) => {
            flowInput = input;
            return delegationResult();
        },
    });

    assert.deepEqual(flowInput, {
        source: token,
        target: {
            resourceType: "whiteboard",
            resourceId: "board-1",
            requiredCapability: "whiteboard:read",
        },
    });
    assert.deepEqual(access, {
        shareGuest: true,
        authorized: true,
        resourceType: "whiteboard",
        resourceId: "board-1",
        requiredCapability: "whiteboard:read",
        username: "guest:guest-1",
        displayName: "Guest One",
    });
});

test("delegated access stays bound to the source share and target request", async () => {
    for (const overrides of [
        { sourceResourceId: "meeting-2" },
        { sourceCapability: "meeting:moderate" },
        { resourceId: "board-2" },
        { allowedCapabilities: ["whiteboard:write"] },
    ]) {
        const access = await resolveShareDelegatedAccess({
            claims: { sub: "share:share-1:guest-1" },
            resourceType: "whiteboard",
            resourceId: "board-1",
            requiredCapability: "whiteboard:read",
            getTokenById: async () => token,
            runDelegationFlow: async () => delegationResult(overrides),
        });
        assert.deepEqual(access, {
            shareGuest: true,
            authorized: false,
        });
    }
});
