import { good } from "./factories.js";

export function bind(root, replacements) {
    const form = root.querySelector("form");
    const builder = good();
    Object.assign(builder, replacements);
    builder.attach(form);
    form.addEventListener("submit", () => {});
}
