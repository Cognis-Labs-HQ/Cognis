import { outside as make } from "../outside.js";

export function bind(root) {
    const form = root.querySelector("form");
    const builder = make();
    builder.attach(form);
    form.addEventListener("submit", () => {});
}
