import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";

function stringOr(value, fallback) {
    return String(value ?? fallback);
}

function renderShareRows(i18n, links) {
    if (!Array.isArray(links) || links.length === 0) {
        return `<p class="jitsi-share-empty">${escapeHtml(i18n.t("module.jitsi_meet.share.empty"))}</p>`;
    }
    return `
        <div class="jitsi-share-list">
            ${links
                .map(
                    (link) => `
                        <article class="jitsi-share-row">
                            <div class="jitsi-share-row-main">
                                <p class="jitsi-share-row-label">${escapeHtml(stringOr(link.label, i18n.t("module.jitsi_meet.share.untitled")))}</p>
                                <p class="jitsi-share-row-url">${escapeHtml(stringOr(link.shareUrl, ""))}</p>
                            </div>
                            <div class="jitsi-share-row-actions">
                                <button type="button" class="btn-confirm btn-animated" data-share-copy="${escapeHtml(stringOr(link.shareUrl, ""))}">${escapeHtml(i18n.t("module.jitsi_meet.share.copy_link"))}</button>
                                <button type="button" class="btn-cancel btn-animated" data-share-delete="${escapeHtml(stringOr(link.id, ""))}">${escapeHtml(i18n.t("module.jitsi_meet.share.revoke"))}</button>
                            </div>
                        </article>
                    `,
                )
                .join("")}
        </div>
    `;
}

function renderBody(i18n, state) {
    return `
        <section class="jitsi-share-popup">
            <div class="jitsi-share-create-form">
                <label>
                    <span>${escapeHtml(i18n.t("module.jitsi_meet.share.label"))}</span>
                    <input id="jitsi-share-label" type="text" value="${escapeHtml(state.label)}" placeholder="${escapeHtml(i18n.t("module.jitsi_meet.share.label_placeholder"))}" />
                </label>
                <label>
                    <span>${escapeHtml(i18n.t("module.jitsi_meet.share.expiry_label"))}</span>
                    <input id="jitsi-share-expiry" type="number" min="1" step="1" value="${escapeHtml(state.expiresInHours)}" placeholder="24" />
                </label>
                <button id="jitsi-share-create-btn" class="btn-confirm btn-animated" type="button" ${state.loading ? "disabled" : ""}>${escapeHtml(i18n.t("module.jitsi_meet.share.generate_link"))}</button>
            </div>
            <div class="jitsi-share-links-wrap">
                ${renderShareRows(i18n, state.links)}
            </div>
        </section>
    `;
}

export async function openSharePopup({ meetingId, i18n }) {
    const state = {
        loading: false,
        links: [],
        label: "",
        expiresInHours: "24",
    };

    async function loadLinks() {
        state.loading = true;
        const response = await apiFetch(
            `/api/v1/modules/jitsi-meet/share?meetingId=${encodeURIComponent(meetingId)}`,
        );
        const payload = await response.json().catch(() => ({ data: [] }));
        state.links = Array.isArray(payload?.data) ? payload.data : [];
        state.loading = false;
    }

    function rerender(overlay) {
        const body = overlay.querySelector(".popup-body");
        if (!(body instanceof HTMLElement)) {
            return;
        }
        body.innerHTML = renderBody(i18n, state);
        attachHandlers(overlay);
    }

    async function handleCreate(overlay) {
        state.loading = true;
        rerender(overlay);
        const response = await apiFetch("/api/v1/modules/jitsi-meet/share", {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                meetingId,
                label: state.label,
                expiresInHours: state.expiresInHours,
            }),
        });
        state.loading = false;
        if (!response.ok) {
            showToast(i18n.t("module.jitsi_meet.share.create_failed"), {
                variant: "error",
            });
            rerender(overlay);
            return;
        }
        const payload = await response.json().catch(() => ({ data: null }));
        await loadLinks();
        rerender(overlay);
        if (payload?.data?.shareUrl) {
            await navigator.clipboard
                .writeText(String(payload.data.shareUrl))
                .then(() => {
                    showToast(i18n.t("module.jitsi_meet.share.copy_success"), {
                        variant: "success",
                    });
                })
                .catch(() => {
                    showToast(i18n.t("module.jitsi_meet.share.copy_failed"), {
                        variant: "error",
                    });
                });
        }
    }

    async function handleDelete(overlay, shareId) {
        state.loading = true;
        rerender(overlay);
        const response = await apiFetch(
            "/api/v1/modules/jitsi-meet/share/delete",
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ meetingId, shareId }),
            },
        );
        state.loading = false;
        if (!response.ok) {
            showToast(i18n.t("module.jitsi_meet.share.delete_failed"), {
                variant: "error",
            });
            rerender(overlay);
            return;
        }
        await loadLinks();
        rerender(overlay);
    }

    function attachHandlers(overlay) {
        overlay
            .querySelector("#jitsi-share-label")
            ?.addEventListener("input", (event) => {
                state.label = String(event.target?.value ?? "");
            });
        overlay
            .querySelector("#jitsi-share-expiry")
            ?.addEventListener("input", (event) => {
                state.expiresInHours = String(event.target?.value ?? "");
            });
        overlay
            .querySelector("#jitsi-share-create-btn")
            ?.addEventListener("click", () => {
                void handleCreate(overlay);
            });
        overlay.querySelectorAll("[data-share-copy]").forEach((button) => {
            button.addEventListener("click", () => {
                const shareUrl = String(
                    button.getAttribute("data-share-copy") ?? "",
                );
                if (!shareUrl) return;
                navigator.clipboard
                    .writeText(shareUrl)
                    .then(() => {
                        showToast(
                            i18n.t("module.jitsi_meet.share.copy_success"),
                            {
                                variant: "success",
                            },
                        );
                    })
                    .catch(() => {
                        showToast(
                            i18n.t("module.jitsi_meet.share.copy_failed"),
                            {
                                variant: "error",
                            },
                        );
                    });
            });
        });
        overlay.querySelectorAll("[data-share-delete]").forEach((button) => {
            button.addEventListener("click", () => {
                const shareId = String(
                    button.getAttribute("data-share-delete") ?? "",
                );
                if (!shareId) return;
                void handleDelete(overlay, shareId);
            });
        });
    }

    await loadLinks();
    await openPopup({
        title: i18n.t("module.jitsi_meet.share.popup_title"),
        body: () => renderBody(i18n, state),
        actions: [
            {
                id: "done",
                label: i18n.t("ui.reuse.done"),
                variant: "confirm",
            },
        ],
        onOpen: (overlay) => {
            attachHandlers(overlay);
        },
    });
}
