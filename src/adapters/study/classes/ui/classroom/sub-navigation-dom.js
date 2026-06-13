export function createSubNavigationDomManager({
    root,
    renderSubNavigationMarkup,
}) {
    function refreshSubNavigation() {
        const subNavigation = root.querySelector(".page-subnav");
        if (!(subNavigation instanceof HTMLElement)) {
            return;
        }
        const nextMarkup = renderSubNavigationMarkup();
        if (subNavigation.innerHTML !== nextMarkup) {
            subNavigation.innerHTML = nextMarkup;
        }
    }

    return {
        refreshSubNavigation,
    };
}
