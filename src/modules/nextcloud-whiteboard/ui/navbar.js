import { apiFetch } from "/static/reuse/api-client.js";
import { registerSearchIndex } from "/static/reuse/search-util/popup.js";

const WHITEBOARD_API_BASE = "/api/v1/modules/nextcloud-whiteboard";

async function fetchVisibleWhiteboards() {
    const response = await apiFetch(`${WHITEBOARD_API_BASE}/whiteboards`);
    if (!response.ok) return [];
    const payload = await response.json().catch(() => null);
    return Array.isArray(payload?.data) ? payload.data : [];
}

function whiteboardFileSearchItem(board) {
    const boardId = String(board?.id ?? "").trim();
    const title = String(board?.title ?? boardId).trim();
    if (!boardId || !title) return null;
    return {
        id: `whiteboard:${boardId}`,
        label: title,
        showDescription: false,
        showMatchSnippet: false,
        url: `/whiteboard?id=${encodeURIComponent(boardId)}`,
        resultClass: "page",
        searchText: [
            title,
            board.externalPath,
            board.createdBy,
            board.updatedAt,
        ]
            .filter(Boolean)
            .join(" "),
        visible: true,
    };
}

async function collectWhiteboardNavbarSearchGroups() {
    const pageItem = {
        id: "whiteboards-page",
        label: "Whiteboards",
        description: "Pages",
        url: "/whiteboards",
        resultClass: "page",
        searchText: "Whiteboards Whiteboard files boards canvas",
        visible: true,
    };
    const fileItems = (await fetchVisibleWhiteboards())
        .map(whiteboardFileSearchItem)
        .filter(Boolean);
    return [
        { category: "Pages", items: [pageItem] },
        fileItems.length ? { category: "Whiteboards", items: fileItems } : null,
    ].filter(Boolean);
}

export function register({ addItem }) {
    addItem?.({
        id: "nextcloud-whiteboard",
        label: "Whiteboards",
        href: "/whiteboards",
        access: { minRole: "user" },
    });
}

registerSearchIndex(
    "nextcloud-whiteboard-navbar",
    collectWhiteboardNavbarSearchGroups,
    {
        componentId: "nextcloud-whiteboard",
    },
);
