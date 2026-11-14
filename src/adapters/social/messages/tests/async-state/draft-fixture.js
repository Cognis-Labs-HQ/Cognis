import vm from "node:vm";
import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import { Element } from "./fixture.js";

export function createDraftFixture() {
    const input = new Element();
    input.id = "messages-composer-input";
    input.closest = () => card;
    const card = new Element();
    card.dataset.composerElement = "messages-conversation";
    card.querySelectorAll = () => [input];
    const root = new Element();
    root.querySelectorAll = () => [card];
    const storage = new Map([["cognis_account", "reader"]]);
    const window = { location: { pathname: "/messages/A" } };
    let selected = "A";
    let active = true;
    const globals = vm.createContext({
        Element,
        Event,
        window,
        localStorage: {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: (key) => storage.delete(key),
        },
    });
    const { createFormDraftManager } = loadTestModule(
        new URL(
            "../../../../../ui/reuse/page-composer/form-draft.js",
            import.meta.url,
        ),
        {},
        globals,
    );
    const manager = createFormDraftManager({
        FORM_DRAFT_STORAGE_PREFIX: "cognis_messages_draft",
        resolveStoragePath: (roomId) =>
            `/messages/${encodeURIComponent(roomId)}`,
        i18n: { t: String },
    });
    const { createMessageDrafts } = loadTestModule(
        new URL("../../ui/composer-drafts.js", import.meta.url),
        {},
        globals,
    );
    const drafts = createMessageDrafts({
        root,
        getInput: () => input,
        getSelectedRoomId: () => selected,
        isActive: () => active,
        manager,
    });
    input.addEventListener("input", drafts.record);
    return {
        input,
        drafts,
        storage,
        manager,
        root,
        isActive: () => active,
        deactivate: () => {
            active = false;
        },
        selected: () => selected,
        select: (id) => {
            selected = id;
            window.location.pathname = `/messages/${id}`;
            drafts.restore({ id });
        },
        edit: (text) => {
            input.value = text;
            input.dispatchEvent(new Event("input"));
        },
        saved: () =>
            manager
                .loadPersistedFormState(selected)
                .get("messages-conversation")
                ?.get("id:messages-composer-input"),
    };
}
