import { createHash } from "node:crypto";
import type { BootstrapLog, ModuleMarketplaceService } from "@cognis/core";

export async function withMarketplaceAssetUrls<
    T extends { assetIds?: unknown },
>(
    module: T,
    marketplace: ModuleMarketplaceService,
    log?: BootstrapLog,
): Promise<
    T & {
        assets?: {
            icon?: string;
            banner?: string;
            screenshots?: string[];
            media?: Array<{ url: string; contentType: string }>;
        };
    }
> {
    const assetIds = module.assetIds as
        | {
              icon?: string;
              banner?: string;
              screenshots?: string[];
              media?: Array<{ id: string; contentType: string }>;
              strings?: Record<string, string>;
          }
        | undefined;
    const assetUrl = (id: string) =>
        `/api/v1/modules/catalog/assets/${encodeURIComponent(id)}`;
    const moduleUi =
        (module as { ui?: Record<string, unknown> }).ui ?? undefined;
    const declaresStrings =
        typeof moduleUi?.stringsBaseUrl === "string" ||
        Boolean(assetIds?.strings);
    const englishStringsId = assetIds?.strings?.en;
    const englishStrings = englishStringsId
        ? await marketplace.getAsset(englishStringsId)
        : undefined;
    if (declaresStrings && !englishStrings) {
        log?.("warn", "Module catalog strings were unavailable.", {
            component: "api-modules",
            operation: "resolve-marketplace-strings",
            moduleUuid: String((module as { uuid?: unknown }).uuid ?? ""),
            locale: "en",
            assetId: englishStringsId,
        });
    }
    return {
        ...module,
        ui: declaresStrings
            ? {
                  ...moduleUi,
                  stringsRevision: createHash("sha256")
                      .update(JSON.stringify(assetIds?.strings ?? {}))
                      .digest("hex"),
                  stringsBaseUrl: englishStrings
                      ? `/api/v1/modules/catalog/strings/${encodeURIComponent(String((module as { uuid?: unknown }).uuid ?? ""))}`
                      : undefined,
              }
            : (module as { ui?: Record<string, unknown> }).ui,
        assets: assetIds
            ? {
                  icon: assetIds.icon ? assetUrl(assetIds.icon) : undefined,
                  banner: assetIds.banner
                      ? assetUrl(assetIds.banner)
                      : undefined,
                  screenshots: (assetIds.screenshots ?? []).map(assetUrl),
                  media: (assetIds.media ?? []).map((entry) => ({
                      url: assetUrl(entry.id),
                      contentType: entry.contentType,
                  })),
              }
            : undefined,
    };
}
