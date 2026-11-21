import { good as make } from "./factories.js";

export function bind(root) {
    const form = root.querySelector("form");
    if (form) {
        const builder = make();
        const controller = builder.attach(form);
        form.addEventListener("submit", () => controller.getValues());
    }
}
