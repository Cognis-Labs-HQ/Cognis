import { loadLibraryUiModule } from "../reuse/ui-module.ts";
import assert from "node:assert/strict";
import test from "node:test";

test("approve, decline and withdraw each require a deliberate confirmation and cancellation preserves the request", async () => {
    for (const action of ["approved", "rejected", "withdraw"]) {
        let listener;
        let confirmation = "cancel";
        const mutations = [];
        const popups = [];
        const request = {
            id: "request",
            destination: { scope: "global" },
            status: "pending",
        };
        const item = {
            dataset: { libraryRequest: "request" },
            setAttribute() {},
            removeAttribute() {},
            querySelectorAll: () => [],
        };
        const button = { dataset: { libraryReview: action } };
        const context = {
            Set,
            openPopup: async (options) => {
                popups.push(options);
                return confirmation;
            },
            reviewLibraryPromotion: async (id, status) => {
                mutations.push([id, status]);
                return { status };
            },
            withdrawLibraryPromotion: async (id) => {
                mutations.push([id, "withdrawn"]);
                return { status: "withdrawn" };
            },
            showToast() {},
        };
        Object.assign(context, loadLibraryUiModule("app/requests.js", context));
        context.bindLibraryRequestReviews(
            {
                addEventListener: (_type, handler) => {
                    listener = handler;
                },
            },
            [request],
            { i18n: { t: (key) => key }, render() {}, reload() {} },
        );
        const event = {
            target: {
                closest: (selector) =>
                    selector === "[data-library-request]"
                        ? item
                        : selector === "[data-library-withdraw-request]"
                          ? action === "withdraw"
                              ? button
                              : null
                          : action === "withdraw"
                            ? null
                            : button,
            },
        };
        await listener(event);
        assert.deepEqual(mutations, []);
        assert.equal(popups[0].variant, "warning");
        confirmation = "confirm";
        await listener(event);
        assert.deepEqual(mutations, [
            ["request", action === "withdraw" ? "withdrawn" : action],
        ]);
    }
});
