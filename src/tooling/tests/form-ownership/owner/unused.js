import { good } from "./factories.js";

function unused() {
    return good();
}

export function bind(root) {
    const form = root.querySelector("form");
    // unused().attach(form) would not establish this form's ownership.
    const ignored = "good().attach(form)";
    form.addEventListener("submit", () => ignored);
}
