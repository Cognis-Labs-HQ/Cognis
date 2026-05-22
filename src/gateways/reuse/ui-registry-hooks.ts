import type { UIRegistry } from "../../api/ui-registry.js";

export function createGatewayUiRegistryHooks(
    uiRegistry: UIRegistry | undefined,
    gatewayId: string,
) {
    return {
        registerNavbarPlugin(
            scriptUrl: string,
            isEnabled?: () => boolean,
        ): void {
            uiRegistry?.registerNavbarPlugin({ scriptUrl, isEnabled });
        },
        registerSpaRoute(route: {
            id: string;
            pattern: string;
            base: string;
            scriptUrl: string;
            stylesheets?: string[];
            isEnabled?: () => boolean;
        }): void {
            uiRegistry?.registerSpaRoute(route);
        },
        registerPageExtension(
            pageId: string,
            element: {
                id: string;
                label: string;
                scriptUrl: string;
                isEnabled?: () => boolean;
            },
        ): void {
            uiRegistry?.registerPageExtension(pageId, element);
        },
        registerStaticDir(urlPrefix: string, absoluteDir: string): void {
            uiRegistry?.registerStaticDir(urlPrefix, absoluteDir);
        },
        registerAdapterStaticDir(adapterId: string, absoluteDir: string): void {
            uiRegistry?.registerAdapterStaticDir(
                gatewayId,
                adapterId,
                absoluteDir,
            );
        },
    };
}
