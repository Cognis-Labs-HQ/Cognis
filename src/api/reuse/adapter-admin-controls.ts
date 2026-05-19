export interface GatewayAdapterAdminControls {
    config: string;
    enable: string;
    disable: string;
    test?: string;
}

export function buildGatewayAdapterAdminControls(
    basePath: string,
    adapterId: string,
    options: { includeTest?: boolean } = {},
): GatewayAdapterAdminControls {
    const encodedAdapterId = encodeURIComponent(adapterId);
    const controls: GatewayAdapterAdminControls = {
        config: `${basePath}/${encodedAdapterId}/config`,
        enable: `${basePath}/${encodedAdapterId}/enable`,
        disable: `${basePath}/${encodedAdapterId}/disable`,
    };

    if (options.includeTest === true) {
        controls.test = `${basePath}/${encodedAdapterId}/test`;
    }

    return controls;
}
