import type { ServerResponse } from "node:http";
import type { ProgressActor, ProgressFilters } from "../types.js";

export function sendJson(
    response: ServerResponse,
    status: number,
    body: unknown,
): void {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
}

export function filtersFrom(url: URL): ProgressFilters {
    return {
        actorId: url.searchParams.get("actorId") ?? undefined,
        schema: url.searchParams.get("schema") ?? undefined,
        layer: url.searchParams.get("layer") ?? undefined,
        language: url.searchParams.get("language") ?? undefined,
        activity: url.searchParams.get("activity") ?? undefined,
        interestVein: url.searchParams.get("interestVein") ?? undefined,
        classroomId: url.searchParams.get("classroomId") ?? undefined,
        eventId: url.searchParams.get("eventId") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        until: url.searchParams.get("until") ?? undefined,
    };
}

export function actorFrom(claims: {
    sub: string;
    role: ProgressActor["role"];
}): ProgressActor {
    return { accountId: claims.sub, role: claims.role };
}
