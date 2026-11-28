import type { UIRegistry } from "../../api/reuse/ui-registry.js";

export function createGatewayUiRegistryHooks(
    uiRegistry: UIRegistry | undefined,
    gatewayId: string,
) {
    return {
        registerNavbarPlugin(
            scriptUrl: string,
            isEnabled?: () => boolean,
            providesCapabilities?: string[],
        ): void {
            uiRegistry?.registerNavbarPlugin?.({
                scriptUrl,
                isEnabled,
                providesCapabilities,
            });
        },
        registerSpaRoute(route: {
            id: string;
            pattern: string;
            base: string;
            scriptUrl: string;
            stylesheets?: string[];
            requiredCapabilities?: string[];
            access?: import("@cognis/core").RoleAccessPolicy;
            isEnabled?: () => boolean;
        }): void {
            uiRegistry?.registerSpaRoute?.(route);
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
            uiRegistry?.registerPageExtension?.(pageId, element);
        },
        registerStaticDirectory(
            urlPrefix: string,
            absoluteDirectory: string,
        ): void {
            uiRegistry?.registerStaticDirectory?.(urlPrefix, absoluteDirectory);
        },
        registerAdapterStaticDirectory(
            adapterId: string,
            absoluteDirectory: string,
        ): void {
            uiRegistry?.registerAdapterStaticDirectory?.(
                gatewayId,
                adapterId,
                absoluteDirectory,
            );
        },
    };
}
