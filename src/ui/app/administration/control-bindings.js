export function createAdministrationControlBindings(bindings) {
    return {
        getState: () => ({
            i18n: bindings.getI18n(),
            moduleById: bindings.getModuleById(),
            gatewayById: bindings.getGatewayById(),
        }),
        ...bindings.controls,
        getComposer: bindings.getComposer,
        getElements: bindings.getElements,
    };
}
