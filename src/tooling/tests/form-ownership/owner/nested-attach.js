import { good } from "./factories.js";

export function bind(root) {
    const form = root.querySelector("form");
    const builder = good();
    function unused() {
        builder.attach(form);
    }
    form.addEventListener("submit", () => {});
}
