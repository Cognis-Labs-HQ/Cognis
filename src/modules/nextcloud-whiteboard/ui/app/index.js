const API_BASE = "/api/v1/modules/nextcloud-whiteboard";

async function readJson(response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Request failed.");
    }
    return payload.data;
}

async function request(path, options = {}) {
    return readJson(
        await fetch(`${API_BASE}${path}`, {
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            ...options,
        }),
    );
}

function text(key) {
    return window.CognisI18n?.t?.(key) ?? key;
}

function renderBoardList(root, boards) {
    const list = root.querySelector("[data-whiteboards]");
    list.replaceChildren();
    if (boards.length === 0) {
        const empty = document.createElement("p");
        empty.className = "whiteboard-empty";
        empty.textContent = text("module.nextcloudWhiteboard.empty");
        list.append(empty);
        return;
    }
    for (const board of boards) {
        const item = document.createElement("article");
        item.className = "whiteboard-card";
        const title = document.createElement("h2");
        title.textContent = board.title;
        const metadata = document.createElement("p");
        metadata.textContent = `${board.role} · ${new Date(board.updatedAt).toLocaleString()}`;
        item.append(title, metadata);
        list.append(item);
    }
}

async function spawnBoard(root) {
    const titleInput = root.querySelector('[name="title"]');
    const participantsInput = root.querySelector('[name="participants"]');
    const participants = participantsInput.value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    const data = await request("/whiteboards/spawn", {
        method: "POST",
        body: JSON.stringify({
            title: titleInput.value,
            participants,
        }),
    });
    window.open(data.launchUrl, "_blank", data.windowFeatures);
    titleInput.value = "";
    participantsInput.value = "";
    renderBoardList(root, await request("/whiteboards"));
}

export async function mount(root) {
    root.innerHTML = "";
    const section = document.createElement("section");
    section.className = "whiteboard-page";
    const heading = document.createElement("h1");
    heading.textContent = text("module.nextcloudWhiteboard.page_title");
    const form = document.createElement("form");
    form.className = "whiteboard-form";
    const titleLabel = document.createElement("label");
    const titleText = document.createElement("span");
    titleText.textContent = text("module.nextcloudWhiteboard.title");
    const titleInput = document.createElement("input");
    titleInput.name = "title";
    titleInput.type = "text";
    titleInput.autocomplete = "off";
    titleLabel.append(titleText, titleInput);
    const participantsLabel = document.createElement("label");
    const participantsText = document.createElement("span");
    participantsText.textContent = text(
        "module.nextcloudWhiteboard.participants",
    );
    const participantsInput = document.createElement("input");
    participantsInput.name = "participants";
    participantsInput.type = "text";
    participantsInput.autocomplete = "off";
    participantsLabel.append(participantsText, participantsInput);
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = text("module.nextcloudWhiteboard.spawn");
    form.append(titleLabel, participantsLabel, submitButton);
    const list = document.createElement("div");
    list.className = "whiteboard-grid";
    list.dataset.whiteboards = "true";
    section.append(heading, form, list);
    root.append(section);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        await spawnBoard(root);
    });
    renderBoardList(root, await request("/whiteboards"));
}

await mount(document.querySelector("#app"));
