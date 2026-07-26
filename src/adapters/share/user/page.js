/** Cognis user sharing method page behavior. */
export function acceptsShare(share) {
    return (
        Array.isArray(share?.accessControls?.recipients) &&
        share.accessControls.recipients.some((entry) => entry?.type === "user")
    );
}

export function buildCreateOptions(input) {
    return { ...input, recipients: input.recipients || [] };
}

export function getPageDefinition() {
    return {
        fields: ["recipients", "permission", "expiry"],
        historyKind: "user",
    };
}
