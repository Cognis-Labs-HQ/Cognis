export function createClassroomWhiteboardWindow({
    root,
    i18n,
    onVisibilityChange = () => {},
}) {
    let panel = null;
    let iframe = null;
    let activeClassId = null;
    let activeBoardId = null;
    let activeBoardName = null;

    function buildPanel() {
        const panelEl = document.createElement("div");
        panelEl.className = "classes-whiteboard-panel";
        panelEl.setAttribute("role", "region");
        panelEl.setAttribute(
            "aria-label",
            i18n.t("module.study.classes.whiteboard"),
        );
        panelEl.hidden = true;

        const header = document.createElement("div");
        header.className = "classes-whiteboard-header";

        const title = document.createElement("span");
        title.className = "classes-whiteboard-title";
        title.textContent = i18n.t("module.study.classes.whiteboard");

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "classes-whiteboard-close-btn";
        closeBtn.setAttribute("aria-label", i18n.t("ui.reuse.close"));
        closeBtn.setAttribute("data-whiteboard-close", "1");

        const iframeEl = document.createElement("iframe");
        iframeEl.className = "classes-whiteboard-iframe";
        iframeEl.setAttribute("allow", "clipboard-read; clipboard-write");
        iframeEl.setAttribute(
            "sandbox",
            "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox",
        );
        iframeEl.setAttribute("loading", "eager");
        iframeEl.src = "about:blank";
        iframe = iframeEl;

        header.appendChild(title);
        header.appendChild(closeBtn);
        panelEl.appendChild(header);
        panelEl.appendChild(iframeEl);
        panel = panelEl;
        return panelEl;
    }

    function getElement() {
        return panel ?? buildPanel();
    }

    function hoist() {
        if (panel) root.appendChild(panel);
    }

    function reattach() {
        if (!panel) return;
        const whiteboardHost = root.querySelector(
            ".classes-whiteboard-workspace-host",
        );
        if (whiteboardHost instanceof HTMLElement) {
            whiteboardHost.appendChild(panel);
            return;
        }
        const blackboard = root.querySelector(".classes-blackboard");
        if (blackboard instanceof HTMLElement) {
            blackboard.appendChild(panel);
        }
    }

    function openBoard({ classId = null, boardId, boardName, embedUrl }) {
        const boardPanel = getElement();
        activeClassId = classId ? String(classId) : null;
        activeBoardId = boardId;
        activeBoardName = boardName;
        const titleEl = boardPanel.querySelector(".classes-whiteboard-title");
        if (titleEl)
            titleEl.textContent =
                boardName || i18n.t("module.study.classes.whiteboard");
        if (iframe) iframe.src = embedUrl;
        boardPanel.hidden = false;
        root.classList.add("classes-whiteboard-active");
        onVisibilityChange({
            visible: true,
            classId: activeClassId,
            boardId: activeBoardId,
        });
    }

    function closeBoard() {
        const closedClassId = activeClassId;
        const closedBoardId = activeBoardId;
        if (panel) panel.hidden = true;
        if (iframe) iframe.src = "about:blank";
        activeClassId = null;
        activeBoardId = null;
        activeBoardName = null;
        root.classList.remove("classes-whiteboard-active");
        onVisibilityChange({
            visible: false,
            classId: closedClassId,
            boardId: closedBoardId,
        });
    }

    function isOpen() {
        return !panel?.hidden && activeBoardId != null;
    }

    function getActiveBoardId() {
        return activeBoardId;
    }

    function handleCloseClick(event) {
        if (!(event.target instanceof Element)) return;
        if (event.target.closest("[data-whiteboard-close]")) {
            closeBoard();
        }
    }

    root.addEventListener("click", handleCloseClick);

    return {
        getElement,
        hoist,
        reattach,
        openBoard,
        closeBoard,
        isOpen,
        getActiveBoardId,
    };
}
