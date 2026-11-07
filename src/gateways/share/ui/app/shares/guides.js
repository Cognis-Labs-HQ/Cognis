export const guides = [
    {
        owner: "share.overview",
        definitions: [
            {
                id: "shares",
                page: "/shares",
                titleKey: "share.tutorial.shares.title",
                steps: [
                    {
                        highlightNext: true,
                        id: "shared-items",
                        selector: "#shares-overview",
                        titleKey: "share.tutorial.shares.shared.items.title",
                        bodyKey: "share.tutorial.shares.shared.items.body",
                    },
                    {
                        highlightNext: true,
                        id: "recipients-and-access",
                        selector: "tr[data-share-expandable]",
                        targetMatch: "first",
                        titleKey:
                            "share.tutorial.shares.recipients.and.access.title",
                        bodyKey:
                            "share.tutorial.shares.recipients.and.access.body",
                    },
                    {
                        highlightNext: true,
                        id: "filter-sharing",
                        selector: '[data-share-filter="sent"]',
                        titleKey: "share.tutorial.shares.filter.sharing.title",
                        bodyKey: "share.tutorial.shares.filter.sharing.body",
                    },
                    {
                        highlightNext: true,
                        id: "manage-share-access",
                        selector: "[data-share-manage]",
                        targetMatch: "first",
                        titleKey:
                            "share.tutorial.shares.manage.share.access.title",
                        bodyKey:
                            "share.tutorial.shares.manage.share.access.body",
                    },
                ],
            },
        ],
    },
];
