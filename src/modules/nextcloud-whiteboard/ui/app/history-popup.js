export async function openWhiteboardHistoryPopup({
    boards,
    escapeHtml,
    openPopup,
    translate,
}) {
    const body = boards.length
        ? `<div class="whiteboard-history-list">${boards
              .map(
                  (board) => `
                    <article class="whiteboard-history-card">
                        <h3>${escapeHtml(board.title)}</h3>
                        <p>${escapeHtml(new Date(board.updatedAt).toLocaleString())}</p>
                        <button type="button" disabled>${escapeHtml(translate("module.nextcloud_whiteboard.open"))}</button>
                    </article>`,
              )
              .join("")}</div>`
        : `<p>${escapeHtml(translate("module.nextcloud_whiteboard.empty"))}</p>`;
    await openPopup({
        title: translate("module.nextcloud_whiteboard.history_title"),
        body,
        actions: [
            {
                id: "done",
                label: translate("ui.reuse.close"),
                variant: "confirm",
            },
        ],
    });
}
