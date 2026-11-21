import { JSDOM } from "jsdom";
import { createSideMenu } from "../../side-menu.js";

export function fixture({ collapsible = true, insideForm = true } = {}) {
    const dom = new JSDOM("<!doctype html><main></main>", {
        url: "https://fixture.invalid/docs",
    });
    globalThis.localStorage = dom.window.localStorage;
    const main = dom.window.document.querySelector("main");
    main.innerHTML = insideForm
        ? "<form><section></section></form>"
        : "<section></section>";
    const root = main.querySelector("section");
    const selections = [];
    const scrolls = [];
    const menu = createSideMenu({
        groups: [
            {
                id: "guide",
                label: "Guide & Notes",
                collapsible,
                items: [
                    {
                        id: "overview",
                        label: "Overview <Current>",
                        targetId: "heading",
                    },
                    { id: "next", label: "Next" },
                ],
            },
        ],
        storageKeyPrefix: "synthetic-menu",
        activeId: "overview",
        onSelect: (id) => selections.push(id),
    });
    root.innerHTML = menu.render();
    const heading = dom.window.document.createElement("h2");
    heading.id = "heading";
    heading.scrollIntoView = (options) => scrolls.push(options);
    main.append(heading);
    const signal = new dom.window.AbortController();
    menu.mount(root, { signal: signal.signal });
    const buttons = [...root.querySelectorAll("[data-side-menu-item]")];
    const submissions = [];
    main.querySelector("form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        submissions.push(event.submitter);
    });
    return {
        dom,
        main,
        root,
        menu,
        signal,
        buttons,
        submissions,
        selections,
        scrolls,
    };
}
