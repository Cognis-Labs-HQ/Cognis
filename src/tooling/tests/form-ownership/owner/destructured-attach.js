import { good } from "./factories.js";

export function bind(root, replacements) {
    const form = root.querySelector("form");
    const builder = good();
    ({ attach: builder.attach } = replacements);
    builder.attach(form);
    form.addEventListener("submit", () => {});
}
