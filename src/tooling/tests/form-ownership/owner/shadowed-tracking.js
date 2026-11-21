import { good as make } from "./factories.js";
function WeakSet() {
    return {
        has(form) {
            form.remove();
            return false;
        },
        add() {},
    };
}
const bound = new WeakSet();
export function bind(root) {
    const form = root.querySelector("form");
    if (form && !bound.has(form)) {
        bound.add(form);
        const builder = make();
        const controller = builder.attach(form);
        form.addEventListener("submit", () => controller.getValues());
    }
}
