import type { StudyAdapterBootstrapCtx } from "../../../gateways/study/gateway.js";
import type { DeckActor, StudyDeck } from "./service/types.js";
import type { DeckService } from "./service/index.js";

export const DECK_RESOURCE = "studyDeck";
export const DECK_READ = "study:flashcards:read";

interface ShareRecord {
    resourceType: string;
    resourceId: string;
    expiresAt: string;
    grantedCapabilities: string[];
}

interface DeckShareGrant {
    grantedCapabilities?: string[];
    accessControls?: {
        permissions?: string[];
        recipients?: Array<{ permissions?: string[] }>;
    };
}

function supportedDeckGrant(input: DeckShareGrant): boolean {
    return (
        (input.grantedCapabilities === undefined ||
            (Array.isArray(input.grantedCapabilities) &&
                input.grantedCapabilities.includes(DECK_READ) &&
                input.grantedCapabilities.every(
                    (capability) => capability === DECK_READ,
                ))) &&
        !input.accessControls?.permissions?.includes("write") &&
        !input.accessControls?.recipients?.some((recipient) =>
            recipient.permissions?.includes("write"),
        )
    );
}

/** Resolves account and guest access through the Share gateway, never through local ACLs. */
export async function canReadSharedDeck(
    ctx: StudyAdapterBootstrapCtx,
    actor: DeckActor,
    deck: StudyDeck,
): Promise<boolean> {
    if (
        !ctx.isAdapterEnabled() ||
        ctx.gatewayRegistry.get("study")?.status === "disabled"
    )
        return false;
    if (actor.accountId.startsWith("share:")) {
        const resolveId = ctx.capabilities.get<
            (claims: { sub: string }) => string
        >("share:resolveGuestId");
        const getToken =
            ctx.capabilities.get<(id: string) => Promise<ShareRecord | null>>(
                "share:getTokenById",
            );
        const id = resolveId?.({ sub: actor.accountId });
        const token = id && getToken ? await getToken(id) : null;
        return (
            !!token &&
            token.resourceType === DECK_RESOURCE &&
            token.resourceId === deck.id &&
            token.grantedCapabilities.includes(DECK_READ) &&
            (!token.expiresAt || Date.parse(token.expiresAt) > Date.now())
        );
    }
    const resolve = ctx.capabilities.get<
        (input: {
            accountId: string;
            resourceType: string;
            resourceId: string;
            requiredCapability: string;
        }) => Promise<{ authorized: boolean }>
    >("share:resolveUserAccess");
    return (
        (
            await resolve?.({
                accountId: actor.accountId,
                resourceType: DECK_RESOURCE,
                resourceId: deck.id,
                requiredCapability: DECK_READ,
            })
        )?.authorized === true
    );
}

/** Installs resource participation in Cognis's existing mint, resolve, renderer, and revocation flows. */
export function registerDeckSharing(
    ctx: StudyAdapterBootstrapCtx,
    service: Pick<DeckService, "owned">,
): void {
    const hook = (
        flow: string,
        stage: string,
        handler: Parameters<typeof ctx.flow.extend>[3],
    ) => {
        if (ctx.flow.exists(flow))
            ctx.flow.extend(
                flow,
                stage,
                { id: `study-flashcards:${flow}:${stage}` },
                async (stageCtx) =>
                    ctx.isAdapterEnabled() &&
                    ctx.gatewayRegistry.get("study")?.status !== "disabled"
                        ? handler(stageCtx)
                        : null,
            );
    };
    hook("mint-share-token", "validate-resource", async (stage) => {
        const input = stage.input as {
            resourceType?: string;
            resourceId?: string;
            ownerAccountId?: string;
            grantedCapabilities?: string[];
            accessControls?: {
                permissions?: string[];
                recipients?: Array<{ permissions?: string[] }>;
            };
        };
        if (input.resourceType !== DECK_RESOURCE) return null;
        const deck = await service.owned(
            input.ownerAccountId ?? "",
            input.resourceId ?? "",
        );
        if (
            !deck ||
            !input.grantedCapabilities?.includes(DECK_READ) ||
            !supportedDeckGrant(input)
        )
            return { valid: false, reason: "forbidden" };
        const language =
            deck.language ??
            (deck.schemas as Array<{ language?: string }>).find(
                (schema) => schema.language,
            )?.language;
        return {
            valid: true,
            resourceType: DECK_RESOURCE,
            resourceId: deck.id,
            ownerAccountId: deck.ownerAccountId,
            metadata: {
                resourceName: deck.name,
                resourceTypeLabel: "Flashcards",
                contentUrl: language
                    ? `/study/${encodeURIComponent(language)}/flashcards/${encodeURIComponent(deck.id)}`
                    : "/study/flashcards",
            },
        };
    });
    hook("mint-share-token", "authorize-minter", (stage) => {
        const result = stage.stageResults["validate-resource"]?.find(
            (value) =>
                (value as { resourceType?: string }).resourceType ===
                DECK_RESOURCE,
        ) as { valid: boolean; ownerAccountId: string } | undefined;
        return result?.valid
            ? { authorized: true, ownerAccountId: result.ownerAccountId }
            : null;
    });
    hook("resolve-share-token", "resolve-resource", async (stage) => {
        const validated = stage.stageResults["validate-token"]?.find(
            (value) =>
                (value as { tokenRecord?: ShareRecord }).tokenRecord
                    ?.resourceType === DECK_RESOURCE,
        ) as
            | {
                  valid: boolean;
                  tokenRecord: ShareRecord & { ownerAccountId: string };
              }
            | undefined;
        if (!validated?.valid) return null;
        const deck = await service.owned(
            validated.tokenRecord.ownerAccountId,
            validated.tokenRecord.resourceId,
        );
        return deck
            ? {
                  resolved: true,
                  resourceType: DECK_RESOURCE,
                  resourceId: deck.id,
                  payload: {
                      deck: { ...deck, progress: {}, canEdit: false },
                      cards: deck.cards,
                  },
              }
            : { resolved: false, reason: "resource_not_found" };
    });
    hook("resolve-share-token", "check-access", (stage) =>
        stage.stageResults["resolve-resource"]?.some(
            (value) =>
                (value as { resourceType?: string; resolved?: boolean })
                    .resourceType === DECK_RESOURCE &&
                (value as { resolved?: boolean }).resolved,
        )
            ? { allowed: true, directAccess: false }
            : null,
    );
    hook("construct-share-page", "resolve-resource-renderer", (stage) =>
        (stage.input as { resourceType?: string })?.resourceType ===
        DECK_RESOURCE
            ? {
                  mountScriptUrl:
                      "/static/adapters/study/flashcards/app/shared-deck.js",
                  stringsBaseUrl: [
                      "/static/adapters/study/flashcards/languages",
                  ],
                  stylesheetUrls: [
                      "/static/adapters/study/flashcards/flashcards.css",
                  ],
              }
            : null,
    );
    if (ctx.flow.exists("update-share-token"))
        ctx.flow.extend(
            "update-share-token",
            "update-token",
            { id: "study-flashcards:validate-share-update", order: -100 },
            async (stage) => {
                if (
                    !ctx.isAdapterEnabled() ||
                    ctx.gatewayRegistry.get("study")?.status === "disabled"
                )
                    return null;
                const input = stage.input as DeckShareGrant & {
                    shareId?: string;
                };
                const getToken =
                    ctx.capabilities.get<
                        (id: string) => Promise<ShareRecord | null>
                    >("share:getTokenById");
                const token = await getToken?.(input.shareId ?? "");
                if (
                    token?.resourceType === DECK_RESOURCE &&
                    !supportedDeckGrant(input)
                )
                    throw new Error("forbidden");
                return null;
            },
        );
    hook("revoke-share-token", "authorize-revocation", async (stage) => {
        const input = stage.input as {
            resourceType?: string;
            resourceId?: string;
            claims?: { sub?: string };
            shareId?: string;
        };
        if (input.resourceType !== DECK_RESOURCE) return null;
        const deck = await service.owned(
            input.claims?.sub ?? "",
            input.resourceId ?? "",
        );
        return deck
            ? {
                  authorized: true,
                  ownerAccountId: deck.ownerAccountId,
                  resourceType: DECK_RESOURCE,
                  resourceId: deck.id,
                  shareId: input.shareId,
              }
            : { authorized: false, reason: "forbidden" };
    });
}
