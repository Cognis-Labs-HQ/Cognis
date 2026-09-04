import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";
import { formatVersion } from "./presentation.js";

export function releaseChannels(module) {
    return [...(module.branches ?? []), ...(module.releases ?? [])].filter(
        (channel, index, entries) =>
            entries.findIndex((entry) => entry.name === channel.name) === index,
    );
}

export async function selectReleaseChannel(module, selectedBranch, i18n) {
    const channels = releaseChannels(module);
    let selectedChannel = module.installedBranch ?? selectedBranch;
    const result = await openPopup({
        title: i18n.t("ui.app.modules.change_release_channel"),
        body: `<div class="module-release-channel-list" role="radiogroup" aria-label="${escapeHtml(i18n.t("ui.app.modules.release_channel"))}">${channels.map((channel) => `<button type="button" class="btn-neutral${channel.name === selectedChannel ? " is-active" : ""}" data-release-channel="${escapeHtml(channel.name)}" aria-pressed="${channel.name === selectedChannel}">${escapeHtml(channel.name)}${channel.version ? ` · ${escapeHtml(formatVersion(channel.version))}` : ""}</button>`).join("")}</div>`,
        actions: [
            {
                id: "confirm",
                label: i18n.t("ui.reuse.confirm"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
        ],
        onOpen: (overlay) => {
            overlay
                .querySelectorAll("[data-release-channel]")
                .forEach((button) =>
                    button.addEventListener("click", () => {
                        selectedChannel = button.dataset.releaseChannel;
                        overlay
                            .querySelectorAll("[data-release-channel]")
                            .forEach((entry) => {
                                const active = entry === button;
                                entry.classList.toggle("is-active", active);
                                entry.setAttribute(
                                    "aria-pressed",
                                    String(active),
                                );
                            });
                    }),
                );
        },
    });
    return result === "confirm" ? selectedChannel : null;
}
