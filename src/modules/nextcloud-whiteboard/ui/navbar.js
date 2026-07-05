export function register({ addItem }) {
    addItem?.({
        id: "nextcloud-whiteboard",
        label: "Whiteboards",
        href: "/whiteboards",
        access: { minRole: "user" },
    });
}
