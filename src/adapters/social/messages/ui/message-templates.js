import { formatTemplate } from "/static/reuse/format-template.js";

const MESSAGE_TEMPLATES_STORAGE_KEY = "messages:saved-templates:v1";
export const MAX_SAVED_MESSAGE_TEMPLATES = 100;

export function normalizeMessageTemplateRecord(record) {
    if (!record || typeof record !== "object") return null;
    const id = String(record.id ?? "").trim();
    const title = String(record.title ?? "").trim();
    const content = String(record.content ?? "").trim();
    if (!id || !title || !content) return null;
    return {
        id,
        title,
        content,
    };
}

function templateStorageKey(accountId) {
    return `${MESSAGE_TEMPLATES_STORAGE_KEY}:${accountId}`;
}

export function loadSavedMessageTemplates(accountId) {
    if (!accountId) return [];
    try {
        const raw = localStorage.getItem(templateStorageKey(accountId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((entry) => normalizeMessageTemplateRecord(entry))
            .filter(Boolean);
    } catch {
        return [];
    }
}

export function persistSavedMessageTemplates(templates, accountId) {
    if (!accountId) return;
    const normalizedTemplates = Array.isArray(templates)
        ? templates
              .map((entry) => normalizeMessageTemplateRecord(entry))
              .filter(Boolean)
        : [];
    localStorage.setItem(
        templateStorageKey(accountId),
        JSON.stringify(normalizedTemplates),
    );
}

export function resolveTemplateRecipient(room, currentAccountId) {
    const members = Array.isArray(room?.members) ? room.members : [];
    const preferredRecipient =
        members.find(
            (member) => String(member?.accountId ?? "") !== currentAccountId,
        ) ??
        members[0] ??
        null;
    if (!preferredRecipient) return null;
    return {
        username: String(preferredRecipient?.handle ?? "").trim(),
        displayName: String(
            preferredRecipient?.displayName ?? preferredRecipient?.handle ?? "",
        ).trim(),
    };
}

export function resolveMessageTemplateVariables(text, room, currentAccountId) {
    if (typeof text !== "string") return "";
    const recipient = resolveTemplateRecipient(room, currentAccountId);
    const values = {
        username: recipient?.username ?? "",
        handle: recipient?.username ?? "",
        display_name: recipient?.displayName ?? "",
        displayName: recipient?.displayName ?? "",
    };
    return formatTemplate(text, values);
}

export function createMessageTemplateId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const randomBytes = crypto.getRandomValues(new Uint8Array(12));
    const randomSuffix = Array.from(randomBytes, (value) =>
        value.toString(16).padStart(2, "0"),
    ).join("");
    return `template-${Date.now().toString(36)}-${randomSuffix}`;
}
