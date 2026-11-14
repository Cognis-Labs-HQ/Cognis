import { good } from "./factories.js";

export function bind(root) {
    const form = root.querySelector("form");
    const builder = good();
    builder.attach = () => {};
    builder.attach(form);
    form.addEventListener("submit", () => {});
}
