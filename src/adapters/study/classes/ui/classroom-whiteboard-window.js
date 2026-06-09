export function createClassroomWhiteboardWindow({ root, i18n }) {
    let panel = null;
    let iframe = null;
    let activeBoardId = null;
    let activeBoardName = null;

    function buildPanel() {
        const el = document.createElement("div");
        el.className = "classes-whiteboard-panel";
        el.setAttribute("role", "dialog");
        el.setAttribute("aria-modal", "true");
        el.setAttribute("aria-label", i18n("module.study.classes.whiteboard"));
        el.hidden = true;

        const header = document.createElement("div");
        header.className = "classes-whiteboard-header";

        const title = document.createElement("span");
        title.className = "classes-whiteboard-title";
        title.textContent = i18n("module.study.classes.whiteboard");

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "classes-whiteboard-close-btn";
        closeBtn.setAttribute("aria-label", i18n("ui.reuse.close"));
        closeBtn.setAttribute("data-whiteboard-close", "1");

        const iframeEl = document.createElement("iframe");
        iframeEl.className = "classes-whiteboard-iframe";
        iframeEl.setAttribute("allow", "clipboard-read; clipboard-write");
        iframeEl.setAttribute(
            "sandbox",
            "allow-scripts allow-same-origin allow-forms allow-popups",
        );
        iframeEl.setAttribute("loading", "eager");
        iframeEl.src = "about:blank";
        iframe = iframeEl;

        header.appendChild(title);
        header.appendChild(closeBtn);
        el.appendChild(header);
        el.appendChild(iframeEl);
        panel = el;
        return el;
    }

    function getElement() {
        return panel ?? buildPanel();
    }

    function hoist() {
        if (panel) root.appendChild(panel);
    }

    function reattach() {
        if (!panel) return;
        const blackboard = root.querySelector(".classes-blackboard");
        if (blackboard) {
            blackboard.appendChild(panel);
        }
    }

    function openBoard({ boardId, boardName, embedUrl }) {
        const el = getElement();
        activeBoardId = boardId;
        activeBoardName = boardName;
        const titleEl = el.querySelector(".classes-whiteboard-title");
        if (titleEl)
            titleEl.textContent =
                boardName || i18n("module.study.classes.whiteboard");
        if (iframe) iframe.src = embedUrl;
        el.hidden = false;
        root.classList.add("classes-whiteboard-active");
    }

    function closeBoard() {
        if (panel) panel.hidden = true;
        if (iframe) iframe.src = "about:blank";
        activeBoardId = null;
        activeBoardName = null;
        root.classList.remove("classes-whiteboard-active");
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
