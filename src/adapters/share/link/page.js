/** Link sharing method page behavior. */
export function acceptsShare(share) {
    return (
        !Array.isArray(share?.accessControls?.recipients) ||
        share.accessControls.recipients.length === 0
    );
}

export function buildCreateOptions(input) {
    return { ...input, recipients: [] };
}

export function getPageDefinition() {
    return {
        fields: ["label", "expiry"],
        historyKind: "link",
    };
}
