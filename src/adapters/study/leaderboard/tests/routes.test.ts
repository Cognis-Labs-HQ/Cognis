import assert from "node:assert/strict";
import test from "node:test";
import { createLeaderboardRoutes } from "../routes/index.js";
import {
    createAuthContext,
    RequestRecorder,
    ResponseRecorder,
} from "../../../../api/tests/reuse/route-test-helpers.js";

test("leaderboard routes finish unauthenticated requests with 401 before reading definitions or standings", async () => {
    let reads = 0;
    const routes = createLeaderboardRoutes(
        {
            listDefinitions: () => {
                reads++;
                return [];
            },
        } as never,
        createAuthContext(new Map()) as never,
    );
    for (const path of ["definitions", "standings?definitionId=weekly"]) {
        const response = new ResponseRecorder();
        assert.equal(
            await routes(
                new RequestRecorder({ method: "GET" }) as never,
                response as never,
                new URL(`http://localhost/api/v1/study/leaderboard/${path}`),
            ),
            true,
        );
        assert.equal(response.statusCode, 401);
        assert.equal(JSON.parse(response.payload).error.code, "unauthorized");
    }
    assert.equal(reads, 0);
});
