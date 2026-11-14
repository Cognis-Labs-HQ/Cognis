import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";
import {
    deleteModuleConfig,
    installModule,
    moduleMutationUncertainty,
    setModuleEnabled,
    uninstallModule,
} from "./api.js";
import {
    activateModule,
    enableModuleWithIntegrityCheck,
    modulePreferenceLabels,
} from "./activation.js";
import { openModulePreferences } from "./preferences.js";
import { moduleChangeDirection } from "./presentation.js";
import { selectReleaseChannel } from "./release-channels.js";
import { confirmModuleUninstall } from "./uninstall.js";

export async function performModuleAction(module, action, owner, selection) {
    const { i18n, isCurrent, isVisible } = owner;
    const check = () => {
        if (!isCurrent()) throw new Error("module_authority_changed");
    };
    const acknowledge = (status) => {
        check();
        module.status = status;
        owner.onAcknowledgedState(status);
    };
    const options = {
        isCurrent,
        isVisible,
        onAcknowledgedState: acknowledge,
        beforeEnable: owner.beforeEnable,
    };
    const disable = async (parameters = {}) => {
        check();
        await setModuleEnabled(module.id, false, { ...parameters, isCurrent });
        acknowledge("disabled");
    };
    const enable = async () => {
        check();
        const enabled = await enableModuleWithIntegrityCheck(
            module.id,
            i18n,
            options,
        );
        check();
        if (enabled) acknowledge("enabled");
        return enabled;
    };
    check();
    if (action === "enable") {
        if (!(await activateModule(module, i18n, options))) return null;
    } else if (action === "disable") {
        await disable();
    } else if (action === "configure") {
        if (!isVisible()) return null;
        const wasDisabled = module.status !== "enabled";
        if (wasDisabled && !(await enable())) return null;
        let didSave;
        try {
            didSave = await openModulePreferences(
                module,
                modulePreferenceLabels(i18n),
                options,
            );
            check();
        } finally {
            if (wasDisabled && !didSave && isCurrent()) await disable();
        }
        if (!didSave) return null;
    } else if (
        ["install", "update", "force-update", "change-channel"].includes(action)
    ) {
        action = await installSelectedModule(
            module,
            action,
            {
                ...owner,
                check,
                enable,
                disable,
            },
            selection,
        );
        if (!action) return null;
    } else if (action === "uninstall") {
        if (!isVisible()) return null;
        const confirmation = await confirmModuleUninstall(i18n);
        check();
        if (!confirmation || !isVisible()) return null;
        await uninstallModule(module.uuid, confirmation);
        check();
        await deleteModuleConfig(module.id);
        check();
        module.installed = false;
        delete module.status;
    } else {
        throw new Error("module_lifecycle_action_unavailable");
    }
    check();
    return { action, status: module.status };
}

async function installSelectedModule(module, action, owner, selection) {
    const { i18n, isCurrent, isVisible, check, disable, enable } = owner;
    let branch = selection.branch;
    if (action === "change-channel") {
        if (!isVisible()) return null;
        const channel = await selectReleaseChannel(module, branch, i18n);
        check();
        if (!channel || channel === module.installedBranch || !isVisible())
            return null;
        branch = channel;
    }
    const restoreEnabledState =
        ["update", "force-update", "change-channel"].includes(action) &&
        module.status === "enabled";
    const changeDirection = moduleChangeDirection(module, branch);
    if (module.installed && changeDirection === "downgrade") {
        if (!isVisible()) return null;
        const result = await openPopup({
            title: i18n.t("ui.app.modules.downgrade_title"),
            body: escapeHtml(i18n.t("ui.app.modules.downgrade_warning")),
            variant: "warning",
            actions: [
                {
                    id: "confirm",
                    label: i18n.t("ui.app.modules.downgrade"),
                    variant: "cancel",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "neutral",
                },
            ],
        });
        check();
        if (result !== "confirm" || !isVisible()) return null;
    }
    if (restoreEnabledState) await disable({ preserveEnabledState: true });
    check();
    let installationUncertain = false;
    try {
        const manifest = await installModule(
            module,
            branch,
            restoreEnabledState,
            { isCurrent },
        );
        check();
        module.version = manifest.version;
        module.restartRequired = manifest.restartRequired;
    } catch (error) {
        installationUncertain =
            moduleMutationUncertainty(error)?.kind === "installation";
        throw error;
    } finally {
        if (
            restoreEnabledState &&
            !installationUncertain &&
            !module.restartRequired &&
            isCurrent()
        )
            await enable();
    }
    check();
    module.installed = true;
    if (module.restartRequired || !restoreEnabledState)
        module.status = "disabled";
    module.installedBranch = branch;
    module.installedCommit = [
        ...(module.branches ?? []),
        ...(module.releases ?? []),
    ].find((entry) => entry.name === branch)?.commit;
    module.installedVersion = module.version;
    module.updateAvailable = false;
    selection.onBranchSelected(branch);
    return action === "update" && changeDirection !== "none"
        ? changeDirection
        : action;
}
