import test from "node:test";
import assert from "node:assert/strict";
import {
    getAdapterDisableContext,
    getGatewayAdapters,
    getGatewayEnableableAdapters,
    isAdapterActive,
    isGatewayEnabled,
    shouldQueryGatewayAdapters,
} from "../app/administration/toggle-flows.js";

const adapters = [
    {
        id: "adapter-a",
        name: "Adapter A",
        enabled: true,
        _gatewayId: "notify",
    },
    {
        id: "adapter-b",
        name: "Adapter B",
        enabled: false,
        _gatewayId: "notify",
    },
    {
        id: "adapter-c",
        name: "Adapter C",
        enabled: true,
        _gatewayId: "auth",
    },
];

test("getGatewayAdapters scopes adapters to a single gateway", () => {
    const results = getGatewayAdapters(adapters, "notify");
    assert.equal(results.length, 2);
    assert.deepEqual(
        results.map((adapter) => adapter.id),
        ["adapter-a", "adapter-b"],
    );
});

test("getGatewayEnableableAdapters returns only disabled adapters", () => {
    const results = getGatewayEnableableAdapters(adapters, "notify");
    assert.deepEqual(
        results.map((adapter) => adapter.id),
        ["adapter-b"],
    );
});

test("getAdapterDisableContext keeps gateway active while another adapter remains enabled", () => {
    const results = getAdapterDisableContext(
        [
            ...adapters,
            {
                id: "adapter-d",
                name: "Adapter D",
                enabled: true,
                _gatewayId: "notify",
            },
        ],
        "notify",
        "adapter-a",
    );
    assert.equal(results.isLastEnabled, false);
    assert.deepEqual(
        results.otherActiveAdapters.map((adapter) => adapter.id),
        ["adapter-d"],
    );
});

test("getAdapterDisableContext flags last enabled adapter", () => {
    const results = getAdapterDisableContext(adapters, "notify", "adapter-a");
    assert.equal(results.isLastEnabled, true);
    assert.equal(results.targetAdapter?.id, "adapter-a");
    assert.deepEqual(results.otherActiveAdapters, []);
});

test("isAdapterActive respects active flag over enabled flag", () => {
    assert.equal(isAdapterActive({ active: true, enabled: false }), true);
    assert.equal(isAdapterActive({ active: false, enabled: true }), false);
    assert.equal(isAdapterActive({ enabled: true }), true);
});

test("isGatewayEnabled returns false for disabled gateways", () => {
    assert.equal(isGatewayEnabled({ status: "disabled" }), false);
    assert.equal(isGatewayEnabled({ status: "active" }), true);
    assert.equal(isGatewayEnabled({}), true);
});

test("shouldQueryGatewayAdapters skips disabled gateways", () => {
    assert.equal(
        shouldQueryGatewayAdapters({ hasAdapters: true, status: "disabled" }),
        false,
    );
    assert.equal(
        shouldQueryGatewayAdapters({ hasAdapters: true, status: "active" }),
        true,
    );
    assert.equal(
        shouldQueryGatewayAdapters({ hasAdapters: false, status: "active" }),
        false,
    );
});
