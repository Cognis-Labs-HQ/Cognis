import { createActionRunner } from "/static/gateways/study/reuse/action-flows.js";
import { apiFetch } from "/static/reuse/api-client.js";

const runLeaderboardAction = createActionRunner("study:leaderboard", [
    "definitions",
    "standings",
]);

export async function fetchLeaderboardDefinitions() {
    return runLeaderboardAction("definitions", async () => {
        const response = await apiFetch(
            "/api/v1/study/leaderboard/definitions",
        );
        if (!response.ok) throw new Error("leaderboard_definitions_failed");
        return (await response.json()).data;
    });
}

export async function fetchLeaderboardStandings(definitionId, locale) {
    return runLeaderboardAction("standings", async () => {
        const query = new URLSearchParams({ definitionId, locale });
        const response = await apiFetch(
            `/api/v1/study/leaderboard/standings?${query}`,
        );
        if (!response.ok) throw new Error("leaderboard_standings_failed");
        return (await response.json()).data;
    });
}
