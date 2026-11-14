import { good } from "./factories.js";

export function bind(root) {
    let form = root.querySelector("form");
    const builder = good();
    builder.attach(form);
    form = root.querySelector(".other");
    form.addEventListener("submit", () => {});
}
