import { good } from "./factories.js";

export function bind(root, replacements) {
    const form = root.querySelector("form");
    const builder = good();
    const alias = builder;
    alias.attach = replacements.attach;
    builder.attach(form);
    form.addEventListener("submit", () => {});
}
