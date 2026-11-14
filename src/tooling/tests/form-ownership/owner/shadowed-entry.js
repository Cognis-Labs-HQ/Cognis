import { good } from "./factories.js";

export function bind(root, good) {
    const form = root.querySelector("form");
    const builder = good();
    builder.attach(form);
    form.addEventListener("submit", () => {});
}
