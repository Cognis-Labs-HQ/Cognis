import { good } from "./factories.js";

export function bind(root) {
    const form = root.querySelector("form");
    const otherForm = root.querySelector(".other");
    const builder = good();
    builder.attach(form);
    form.addEventListener("submit", () => {});
    otherForm.addEventListener("submit", () => {});
}
