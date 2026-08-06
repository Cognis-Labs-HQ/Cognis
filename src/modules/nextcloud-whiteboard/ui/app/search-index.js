export function createWhiteboardSearchCollector({
    getActiveBoard,
    getBoards,
    getSavedElements,
    translate,
}) {
    return function collectWhiteboardSearchGroups() {
        const items = [];
        for (const board of getBoards() ?? []) {
            const title = String(board?.title ?? board?.id ?? "").trim();
            if (!title) continue;
            items.push({
                id: `whiteboard:${board.id ?? title}`,
                label: title,
                showDescription: false,
                showMatchSnippet: false,
                url: `/whiteboard?id=${encodeURIComponent(board.id ?? "")}`,
                resultClass: "page",
                searchText: [
                    title,
                    board?.externalPath,
                    board?.createdBy,
                    board?.updatedAt,
                ]
                    .filter(Boolean)
                    .join(" "),
            });
        }
        const activeBoard = getActiveBoard();
        const elementText = JSON.stringify(getSavedElements() ?? []);
        if (activeBoard?.id && elementText && elementText !== "[]") {
            items.push({
                id: `whiteboard:${activeBoard.id}:contents`,
                label:
                    activeBoard.title ||
                    translate("module.nextcloud_whiteboard.canvas_window"),
                showDescription: false,
                showMatchSnippet: false,
                url: `/whiteboard?id=${encodeURIComponent(activeBoard.id)}`,
                resultClass: "text",
                searchText: elementText,
            });
        }
        return [{ category: "Whiteboards", items }];
    };
}
