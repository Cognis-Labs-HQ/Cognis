import { uiCtx } from "../../reuse/ui-ctx.js";
import { showToast } from "../../reuse/toast.js";
import { setModuleEnabled } from "./api.js";
import { enableModuleWithIntegrityAcknowledgement } from "./integrity.js";
import {
    assertRequiredModulePreferences,
    missingRequiredModulePreferenceKeys,
    openModulePreferences,
} from "./preferences.js";
import { presentActivationGuidance } from "./activation-guidance.js";

export function modulePreferenceLabels(i18n) {
    return {
        i18n,
        title: i18n.t("ui.app.modules.preferences_title"),
        save: i18n.t("ui.reuse.save"),
        cancel: i18n.t("ui.reuse.cancel"),
        information: i18n.t("ui.reuse.more_information"),
    };
}

export function enableModuleWithIntegrityCheck(moduleId, i18n, options) {
    return enableModuleWithIntegrityAcknowledgement(
        moduleId,
        {
            title: i18n.t("ui.app.modules.integrity_title"),
            warning: i18n.t("ui.app.modules.integrity_warning"),
            missingShasum: i18n.t("ui.app.modules.integrity_missing_shasum"),
            missingFile: i18n.t("ui.app.modules.integrity_missing_file"),
            mismatch: i18n.t("ui.app.modules.integrity_mismatch"),
            expected: i18n.t("ui.app.modules.integrity_expected"),
            actual: i18n.t("ui.app.modules.integrity_actual"),
            acknowledge: i18n.t("ui.app.modules.integrity_acknowledge"),
            cancel: i18n.t("ui.reuse.cancel"),
        },
        options,
    );
}

export async function activateModule(
    module,
    i18n,
    {
        isCurrent = () => true,
        isVisible = () => true,
        onAcknowledgedState,
        beforeEnable,
    } = {},
) {
    const options = { isCurrent, isVisible, beforeEnable };
    const check = () => {
        if (!isCurrent()) throw new Error("module_authority_changed");
    };
    const rollback = async () => {
        await setModuleEnabled(module.id, false, options);
        check();
        onAcknowledgedState?.("disabled");
    };
    check();
    const requiredMessage = i18n.t("ui.app.modules.config_required");
    const configRouteAvailable = await prepareRequiredModulePreferences(
        module,
        i18n,
        requiredMessage,
        options,
    );
    check();
    if (configRouteAvailable === null) return null;
    if (!configRouteAvailable) {
        const result = await enableModuleWithIntegrityCheck(
            module.id,
            i18n,
            options,
        );
        check();
        if (!result) return null;
        onAcknowledgedState?.("enabled");
        let configuredAfterEnable;
        try {
            configuredAfterEnable = await assertRequiredModulePreferences(
                module,
                requiredMessage,
            );
            check();
        } catch (configError) {
            check();
            if (configError.code !== "module_config_required") {
                await rollback();
                throw configError;
            }
        }
        if (configuredAfterEnable) {
            await showActivationGuidance(module, i18n, options);
            return result;
        }
        check();
        if (!isVisible()) {
            await rollback();
            return null;
        }
        let savedValues;
        try {
            savedValues = await openModulePreferences(
                module,
                modulePreferenceLabels(i18n),
                options,
            );
            check();
            if (savedValues)
                assertSavedRequiredPreferences(
                    module,
                    savedValues,
                    requiredMessage,
                );
        } catch (setupError) {
            await rollback();
            throw setupError;
        }
        if (!savedValues) {
            await rollback();
            return null;
        }
        await showActivationGuidance(module, i18n, options);
        return result;
    }
    const result = await enableModuleWithIntegrityCheck(
        module.id,
        i18n,
        options,
    );
    check();
    if (result) {
        onAcknowledgedState?.("enabled");
        await showActivationGuidance(module, i18n, options);
    }
    return result;
}

async function prepareRequiredModulePreferences(
    module,
    i18n,
    message,
    options,
) {
    try {
        const available = await assertRequiredModulePreferences(
            module,
            message,
        );
        if (!available) return false;
        return true;
    } catch (error) {
        if (error.code !== "module_config_required") throw error;
        if (!options.isCurrent()) throw new Error("module_authority_changed");
        if (!options.isVisible()) return null;
        const savedValues = await openModulePreferences(
            module,
            modulePreferenceLabels(i18n),
            options,
        );
        if (!savedValues) return null;
        assertSavedRequiredPreferences(module, savedValues, message);
        return true;
    }
}

function assertSavedRequiredPreferences(module, values, message) {
    const missingKeys = missingRequiredModulePreferenceKeys(
        module.ui?.preferences ?? [],
        values,
    );
    if (!missingKeys.length) return;
    const validationError = new Error(message);
    validationError.code = "module_config_required";
    throw validationError;
}

async function showActivationGuidance(module, i18n, owner) {
    if (!owner.isCurrent() || !owner.isVisible()) return;
    try {
        await presentActivationGuidance(module, i18n, owner);
    } catch (error) {
        if (error?.code === "missing_translation") throw error;
        if (!owner.isCurrent() || !owner.isVisible()) return;
        uiCtx.capabilities.get("ui:log")?.(
            "warn",
            "module_activation_guidance_unavailable",
            {
                moduleId: module.id,
                name: error?.name,
            },
        );
        showToast(i18n.t("ui.app.modules.guidance_unavailable"), {
            type: "warning",
        });
    }
}
