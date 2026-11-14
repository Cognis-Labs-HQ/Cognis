import { good } from "./factories.js";

export function bind(root) {
    const form = root.querySelector("form");
    const builder = good();
    form.addEventListener("submit", () => {});
    builder.attach(form);
}
