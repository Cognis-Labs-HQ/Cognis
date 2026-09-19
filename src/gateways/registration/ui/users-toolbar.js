import { apiFetch } from "/static/reuse/api-client.js";
import { loadRegistrationState } from "./client.js";
import { shouldShowInviteMenuEntry } from "./invite-menu-visibility.js";

export async function createUsersToolbarActions({ i18n, role, isFounder }) {
    const response = await loadRegistrationState(apiFetch);
    if (!response.ok) return [];
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
        return [];
    }
    return [
        {
            id: "registration-invite",
            label: i18n.t("ui.reuse.invite"),
            render: () =>
                `<a class="btn-confirm btn-animated" href="/invite">+ ${i18n.t("ui.reuse.invite")}</a>`,
        },
    ];
}
