import { good, custom } from "./factories.js";

export function bind(root) {
    const form = root.querySelector("form");
    let builder = good();
    builder = custom();
    builder.attach(form);
    form.addEventListener("submit", () => {});
}
