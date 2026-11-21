import { good as make } from "./factories.js";
const bound = new WeakSet();
bound.has = (form) => {
    form.remove();
    return false;
};
export function bind(root) {
    const form = root.querySelector("form");
    if (form && !bound.has(form)) {
        bound.add(form);
        const builder = make();
        const controller = builder.attach(form);
        form.addEventListener("submit", () => controller.getValues());
    }
}
