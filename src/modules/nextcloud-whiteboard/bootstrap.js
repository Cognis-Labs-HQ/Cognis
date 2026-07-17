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

    const getEmbedUrl = (whiteboardId) => {
        if (!whiteboardId) return null;
        return `/whiteboard?id=${encodeURIComponent(whiteboardId)}`;
    };

    const fetchBoardData = async (whiteboardId) => {
        const moduleApi = systemCtx?.getCapability?.(
            "nextcloud-whiteboard:api",
        );
        if (!moduleApi) {
            throw new Error(
                "Nextcloud Whiteboard API capability is unavailable.",
            );
        }
        return moduleApi.fetchBoardData(whiteboardId);
    };

    systemCtx?.contributePublicCapability?.(
        "nextcloud-whiteboard:spawnWhiteboardWindow",
        spawnWhiteboardWindow,
    );
    systemCtx?.contributePublicCapability?.(
        "whiteboard:getEmbedUrl",
        getEmbedUrl,
    );
    systemCtx?.contributePublicCapability?.(
        "whiteboard:fetchBoardData",
        fetchBoardData,
    );

    ctx.flow.extend(
        "bootstrap-platform",
        "register-flows",
        { id: "nextcloud-whiteboard-module:bootstrap-registration" },
        () => ({
            moduleId: "nextcloud-whiteboard",
            registeredCapabilities: [
                "nextcloud-whiteboard:spawnWhiteboardWindow",
                "whiteboard:getEmbedUrl",
                "whiteboard:fetchBoardData",
            ],
        }),
    );
}
