import assert from "node:assert/strict";
import test from "node:test";
import { createCtx } from "@cognis/core";
import { createFavouriteRoutes } from "../reuse/favourite-routes.js";
import { StudyFavourites } from "../reuse/favourites.js";
import { VolatileUserPreferenceStore } from "../../../api/reuse/preference-store.js";
import {
    RequestRecorder,
    ResponseRecorder,
} from "../../../api/tests/reuse/route-test-helpers.js";

test("favourite writes accept prefixed accounts and reject explicit guest credentials", async () => {
    const root = createCtx();
    root.registerFlow({
        id: "study:favourites:save",
        stages: ["authorize", "validate", "persist"],
    });
    for (const purpose of ["session", "share"] as const) {
        const service = new StudyFavourites(new VolatileUserPreferenceStore());
        const route = createFavouriteRoutes(
            service,
            {
                requireAuth: () => ({
                    sub: "share:ordinary",
                    role: "user",
                    purpose,
                }),
            } as never,
            root.flow,
        );
        const response = new ResponseRecorder();
        await route(
            new RequestRecorder({
                method: "PUT",
                body: JSON.stringify({
                    kind: "deck",
                    id: "fixture",
                    favourite: true,
                }),
            }) as never,
            response as never,
            new URL("http://localhost/api/v1/study/favourites"),
        );
        assert.equal(response.statusCode, purpose === "session" ? 200 : 403);
        assert.equal(
            (await service.list("share:ordinary")).length,
            purpose === "session" ? 1 : 0,
        );
    }
});
