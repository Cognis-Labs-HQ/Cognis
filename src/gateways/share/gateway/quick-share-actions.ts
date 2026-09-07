type NotifyGatewayLike = {
    listSenders(): Array<{
        senderId: string;
        name?: string;
        active?: boolean;
    }>;
};

type QuickShareBuilder = (input: {
    shareUrl: string;
    label?: string | null;
}) => string | null | undefined;

export type QuickShareAction = {
    id: string;
    label: string;
    href: string;
};

export async function resolveQuickShareActions(
    getCapability: <T>(name: string) => T | undefined,
    input: {
        shareUrl: string;
        label?: string | null;
    },
): Promise<QuickShareAction[]> {
    const notifyGateway = getCapability<NotifyGatewayLike>("notify:gateway");
    if (!notifyGateway || typeof notifyGateway.listSenders !== "function") {
        return [];
    }

    const actions = await Promise.all(
        notifyGateway.listSenders().map(async (sender) => {
            if (!sender?.active) {
                return null;
            }
            const senderId = String(sender.senderId ?? "").trim();
            if (!senderId) {
                return null;
            }
            const buildQuickShareAction = getCapability<QuickShareBuilder>(
                `notify:quickShare:${senderId}`,
            );
            if (typeof buildQuickShareAction !== "function") {
                return null;
            }
            const href = String(
                buildQuickShareAction({
                    shareUrl: input.shareUrl,
                    label: input.label,
                }) ?? "",
            ).trim();
            if (!href) {
                return null;
            }
            return {
                id: senderId,
                label: String(sender.name ?? senderId).trim() || senderId,
                href,
            };
        }),
    );

    return actions.filter(
        (action): action is QuickShareAction => action !== null,
    );
}
