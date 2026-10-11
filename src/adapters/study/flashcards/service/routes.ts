import type { BootstrapLog } from "../../../../gateways/shared.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import { DeckService } from "./service.js";

export function createDeckRoutes(
    service: DeckService,
    ctx: RouteContext,
    log?: BootstrapLog,
): (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean> {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const match = url.pathname.match(
            /^\/api\/v1\/study\/decks(?:\/([^/]+))?(?:\/(review))?$/,
        );
        if (!match) return false;
        const claims = ctx.requireAuth(req, res);
        if (!claims) return true;
        const actor = { accountId: claims.sub, role: claims.role, claims };
        const id = match[1];
        const send = (status: number, body: unknown) => {
            res.writeHead(status, { "content-type": "application/json" });
            res.end(JSON.stringify(body));
        };
        try {
            if (req.method === "GET" && !match[2]) {
                send(200, {
                    data: id
                        ? await service.details(actor, id)
                        : await service.list(actor),
                });
                return true;
            }
            if (req.method === "POST" && id && match[2]) {
                const body = (await readJson(req)) as {
                    cardId: unknown;
                    grade: unknown;
                };
                if (!body || typeof body !== "object")
                    throw new Error("invalid_deck_card");
                send(200, {
                    data: await service.review(
                        actor,
                        id,
                        body.cardId,
                        body.grade,
                    ),
                });
                return true;
            }
            if (
                (req.method === "POST" && !id) ||
                (req.method === "PUT" && id && !match[2])
            ) {
                send(id ? 200 : 201, {
                    data: await service.save(actor, await readJson(req), id),
                });
                return true;
            }
            if (req.method === "DELETE" && id && !match[2]) {
                await service.delete(actor, id);
                send(200, { data: { deleted: true } });
                return true;
            }
            return false;
        } catch (error) {
            const reason =
                error instanceof Error ? error.message : "deck_failed";
            await log?.("error", "Study deck request failed.", {
                component: "study-flashcards",
                operation: "deckRequest",
                accountId: actor.accountId,
                errorName: error instanceof Error ? error.name : "Unknown",
            });
            const known = [
                "deck_read_only",
                "invalid_deck",
                "invalid_deck_notes",
                "empty_deck",
                "deck_card_unavailable",
                "invalid_review_grade",
                "invalid_deck_card",
                "deck_not_found",
                "library_unavailable",
            ].includes(reason);
            send(
                reason === "deck_not_found"
                    ? 404
                    : reason === "deck_read_only"
                      ? 403
                      : known
                        ? 400
                        : 500,
                {
                    error: { code: known ? reason : "deck_failed" },
                },
            );
            return true;
        }
    };
}
