import { registerApiRoutes, registerUi } from "./api/index.js";

export function bootstrapModule(ctx) {
    registerUi(ctx);
    registerApiRoutes(ctx.router, ctx);

    const systemCtx = ctx.getCapability("system:ctx");
    const spawnWhiteboardWindow = async (options = {}) => {
        const moduleApi = systemCtx?.getCapability?.(
            "nextcloud-whiteboard:api",
        );
        if (!moduleApi) {
            throw new Error(
                "Nextcloud Whiteboard API capability is unavailable.",
            );
        }
        return moduleApi.spawnWhiteboardWindow(options);
    };

    systemCtx?.contributePublicCapability?.(
        "nextcloud-whiteboard:spawnWhiteboardWindow",
        spawnWhiteboardWindow,
    );

    ctx.flow.extend(
        "bootstrap-platform",
        "register-flows",
        { id: "nextcloud-whiteboard-module:bootstrap-registration" },
        () => ({
            moduleId: "nextcloud-whiteboard",
            registeredCapabilities: [
                "nextcloud-whiteboard:spawnWhiteboardWindow",
            ],
        }),
    );
}
