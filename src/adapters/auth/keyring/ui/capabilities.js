export function registerKeyringCapabilities(uiCtx, keyring) {
    if (uiCtx.capabilities.get("keyring:readState")) return false;
    const stateFlow = "keyring:readState";
    uiCtx.registerFlow(stateFlow, ["load", "present"]);
    uiCtx.extendFlow(
        stateFlow,
        "load",
        { id: "keyring:stateLoader" },
        async ({ data }) => {
            data.state = await keyring.readState();
        },
    );
    uiCtx.extendFlow(
        stateFlow,
        "present",
        { id: "keyring:statePresentation" },
        ({ data }) => {
            data.state = {
                exists: data.state.exists === true,
                unlocked: data.state.unlocked === true,
            };
        },
    );
    const capabilities = {
        "keyring:get": keyring.get,
        "keyring:set": keyring.set,
        "keyring:delete": keyring.delete,
        "keyring:list": keyring.list,
        "keyring:listEvents": keyring.listEvents,
        "keyring:clear": keyring.clear,
        "keyring:destroy": keyring.destroy,
        "keyring:create": keyring.create,
        "keyring:exists": keyring.exists,
        "keyring:readState": async () =>
            (await uiCtx.runFlow(stateFlow, {})).data.state,
        "keyring:clearAccountState": keyring.clearAccountState,
        "keyring:changePassword": keyring.changePassword,
        "keyring:resolve": keyring.resolve,
        "keyring:lock": keyring.lock,
        "keyring:unlock": keyring.unlock,
        "keyring:requestUnlock": keyring.requestUnlock,
        "keyring:restoreSession": keyring.restoreSession,
        "keyring:isUnlocked": keyring.isUnlocked,
        "keyring:isAccessSuppressed": keyring.isAccessSuppressed,
        "keyring:hasDeferredSetup": keyring.hasDeferredSetup,
        "keyring:activateTemporary": keyring.activateTemporary,
        "keyring:endTemporary": keyring.endTemporary,
        "keyring:forComponent": keyring.forComponent,
        "keyring:getRelockMinutes": keyring.getRelockMinutes,
        "keyring:setRelockMinutes": keyring.setRelockMinutes,
    };
    for (const [name, implementation] of Object.entries(capabilities))
        uiCtx.capabilities.contribute(name, implementation);
    return true;
}

export function registerKeyringLoginFlow(uiCtx, setupAfterLogin) {
    if (!uiCtx.flowExists("complete-login")) return;
    uiCtx.extendFlow(
        "complete-login",
        "setup-account-services",
        { id: "auth-keyring:setup-after-login" },
        (stageContext) =>
            setupAfterLogin(String(stageContext.input?.accountPassword ?? ""), {
                deferNewSetup:
                    stageContext.input?.deferNewKeyringSetup === true,
            }),
    );
}
