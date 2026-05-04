import { DbProfileStore } from "../../adapters/db/profile-store.js";
import { createProfileRoutes } from "../../routes/profile/index.js";
import { createSocialRoutes } from "../../routes/social/index.js";
import { createPostRoutes } from "../../routes/posts/index.js";
import { createFileRoutes } from "../../routes/files/index.js";
import type { FileStorageGateway } from "@cognis/core";
import type { GatewayBootstrapContext } from "../../gateway-bootstrap.js";

/**
 * Standard gateway bootstrap entry point for all profile, social, post, and
 * file storage functionality. Core has no knowledge of any of these concepts.
 *
 * Capabilities contributed to the store:
 *
 *   profile:createProfile  — (accountId, handle, role?) => Promise<void>
 *                            Called by auth and user routes on register/login
 *                            to ensure a profile row exists. Silently no-ops
 *                            if this gateway is absent.
 *   profile:setRoleByHandle — (handle, role) => Promise<void>
 *                            Called by user:role route when the profile gateway
 *                            is present so profile rows stay in sync.
 *
 * If the `file:gateway` capability is not present the profile gateway still
 * starts, but avatar/banner upload routes and file routes are not registered.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const profileStore = new DbProfileStore(ctx.dbExecutor, ctx.dbType);
    await profileStore.ensureSchema();

    ctx.log?.("info", "Profile gateway: schema ready.");

    ctx.capabilities.contribute(
        "profile:createProfile",
        async (
            accountId: string,
            handle: string,
            role?: string,
        ): Promise<void> => {
            await profileStore.createProfile(
                accountId,
                handle,
                (role as any) ?? "user",
            );
        },
    );

    ctx.capabilities.contribute(
        "profile:setRoleByHandle",
        async (handle: string, role: string): Promise<void> => {
            await profileStore.setRoleByHandle(handle, role as any);
        },
    );

    const fileGateway =
        ctx.capabilities.get<FileStorageGateway>("file:gateway");

    if (fileGateway) {
        ctx.routeRegistry.register(
            createProfileRoutes(profileStore, fileGateway),
        );
        ctx.routeRegistry.register(createFileRoutes(profileStore, fileGateway));
        ctx.log?.(
            "info",
            "Profile gateway: profile and file routes registered.",
        );
    } else {
        ctx.log?.(
            "warn",
            "Profile gateway: file:gateway capability not found — avatar/banner/file routes not registered.",
        );
    }

    ctx.routeRegistry.register(createSocialRoutes(profileStore));
    ctx.routeRegistry.register(createPostRoutes(profileStore));

    ctx.gatewayRegistry.register({
        id: "profile",
        name: "Profile Gateway",
        version: "0.1.0",
        description: "User profiles, social graph, posts, and file storage.",
        publisher: "Cognis Labs",
    });

    ctx.log?.("info", "Profile gateway: initialized.");
}
