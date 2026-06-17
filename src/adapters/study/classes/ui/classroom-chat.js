let chatModulePromise = null;
let chatWarningLogged = false;

function logChatFailure(error) {
    if (chatWarningLogged) return;
    chatWarningLogged = true;
    console.warn("[classroom] Failed to load embedded chat factory.", {
        operation: "loadClassroomChatEmbed",
        error: error instanceof Error ? error.message : String(error),
    });
}

function loadChatModule() {
    if (chatModulePromise) return chatModulePromise;
    const scriptUrl = String(
        document.querySelector('meta[name="classroom-chat-script"]')
            ?.content ?? "",
    ).trim();
    if (!scriptUrl) return Promise.resolve(null);
    chatModulePromise = import(scriptUrl)
        .then((loaded) => loaded)
        .catch((error) => {
            logChatFailure(error);
            return null;
        });
    return chatModulePromise;
}

/**
 * Creates a classroom chat panel by delegating to the social gateway's embedded
 * chat factory, loaded dynamically from the URL in
 * `<meta name="classroom-chat-script">`. Returns synchronously with a deferred
 * proxy — the real panel mounts once the factory module loads.
 */
export function createClassroomNativeChat(options) {
    const container = document.createElement("div");
    container.className = "classes-chat-container";

    let delegate = null;
    let pendingChatUrl = null;

    loadChatModule().then((loaded) => {
        if (typeof loaded?.createClassroomNativeChat !== "function") {
            logChatFailure(new Error("createClassroomNativeChat not exported"));
            return;
        }
        delegate = loaded.createClassroomNativeChat(options);
        container.replaceWith(delegate.panel);
        if (pendingChatUrl !== null) {
            delegate.openChat(pendingChatUrl);
            pendingChatUrl = null;
        }
    });

    return {
        get panel() { return delegate?.panel ?? container; },
        openChat(chatUrl) {
            if (delegate) {
                delegate.openChat(chatUrl);
            } else {
                pendingChatUrl = chatUrl;
            }
        },
        closeChat() {
            delegate?.closeChat();
            pendingChatUrl = null;
        },
        isOpen() { return delegate?.isOpen() ?? false; },
    };
}
