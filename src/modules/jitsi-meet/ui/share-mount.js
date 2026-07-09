import { mount as mountMeetingsPage } from "/static/modules/jitsi-meet/app.js";

export async function mount(root, { shareData, signal } = {}) {
    if (!(root instanceof HTMLElement)) return;
    const resourceId = String(
        shareData?.resourceId ?? shareData?.payload?.meetingId ?? "",
    ).trim();
    await mountMeetingsPage(root, {
        signal,
        requestedMeetingId: resourceId,
        embedded: true,
        shareEnabled: false,
    });
}
