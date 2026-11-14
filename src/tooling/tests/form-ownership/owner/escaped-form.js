import { good } from "./factories.js";

export function bind(root, inspect) {
    const form = root.querySelector("form");
    inspect(form);
    const builder = good();
    builder.attach(form);
    form.addEventListener("submit", () => {});
}
