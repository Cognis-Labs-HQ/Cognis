import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { loadRegistrationState } from "./client.js";
import { shouldShowInviteMenuEntry } from "./invite-menu-visibility.js";

export async function createUsersLeadingControls({ i18n, role, isFounder }) {
    const response = await loadRegistrationState(apiFetch);
    if (!response.ok) return "";
    const payload = await response.json().catch(() => null);
    const state = payload?.data ?? {};
    if (
        !shouldShowInviteMenuEntry({
            role,
            isFounder,
            gatewayEnabled: state.gatewayEnabled,
            inviteEnabled: state.inviteEnabled,
            canInvite: state.canInvite,
        })
    ) {
        return "";
    }
    return `<div class="controls"><a class="btn-confirm btn-animated" href="/invite">+ ${escapeHtml(i18n.t("ui.reuse.invite"))}</a></div>`;
}
