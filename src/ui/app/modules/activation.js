import { setModuleEnabled } from "./api.js";
import { enableModuleWithIntegrityAcknowledgement } from "./integrity.js";
import {
    assertRequiredModulePreferences,
    openModulePreferences,
} from "./preferences.js";

export function modulePreferenceLabels(i18n) {
    return {
        i18n,
        title: i18n.t("ui.app.modules.preferences_title"),
        save: i18n.t("ui.reuse.save"),
        cancel: i18n.t("ui.reuse.cancel"),
        information: i18n.t("ui.reuse.more_information"),
    };
}

export function enableModuleWithIntegrityCheck(moduleId, i18n) {
    return enableModuleWithIntegrityAcknowledgement(moduleId, {
        title: i18n.t("ui.app.modules.integrity_title"),
        warning: i18n.t("ui.app.modules.integrity_warning"),
        missingShasum: i18n.t("ui.app.modules.integrity_missing_shasum"),
        missingFile: i18n.t("ui.app.modules.integrity_missing_file"),
        mismatch: i18n.t("ui.app.modules.integrity_mismatch"),
        expected: i18n.t("ui.app.modules.integrity_expected"),
        actual: i18n.t("ui.app.modules.integrity_actual"),
        acknowledge: i18n.t("ui.app.modules.integrity_acknowledge"),
        cancel: i18n.t("ui.reuse.cancel"),
    });
}

export async function activateModule(module, i18n) {
    const requiredMessage = i18n.t("ui.app.modules.config_required");
    const configRouteAvailable = await assertRequiredModulePreferences(
        module,
        requiredMessage,
    );
    const result = await enableModuleWithIntegrityCheck(module.id, i18n);
    if (!result || configRouteAvailable) return result;
    try {
        await assertRequiredModulePreferences(module, requiredMessage);
    } catch (error) {
        if (error.code !== "module_config_required") {
            await setModuleEnabled(module.id, false);
            throw error;
        }
        try {
            const saved = await openModulePreferences(
                module,
                modulePreferenceLabels(i18n),
            );
            if (!saved) {
                await setModuleEnabled(module.id, false);
                return null;
            }
            await assertRequiredModulePreferences(module, requiredMessage);
        } catch (setupError) {
            await setModuleEnabled(module.id, false);
            throw setupError;
        }
    }
    return result;
}
