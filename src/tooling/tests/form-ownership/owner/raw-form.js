import { good } from "./factories.js";

export function bind(root) {
    root.innerHTML = "<form></form>";
    const form = root.querySelector("form");
    const builder = good();
    builder.attach(form);
    form.addEventListener("submit", () => {});
}
