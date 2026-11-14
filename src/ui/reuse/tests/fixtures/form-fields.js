// DOM contract fakes for the form builder. They deliberately do not model layout.
class FieldElement extends EventTarget {
    constructor(value = "") {
        super();
        this.value = value;
        this.attributes = new Map();
        this.classes = new Set();
        this.classList = {
            toggle: (name, enabled) =>
                enabled ? this.classes.add(name) : this.classes.delete(name),
            contains: (name) => this.classes.has(name),
        };
        this.dataset = {};
    }
    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }
    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }
    toggleAttribute(name, enabled) {
        if (enabled) this.attributes.set(name, "");
        else this.attributes.delete(name);
    }
    hasAttribute(name) {
        return this.attributes.has(name);
    }
    focus() {
        this.focused = true;
    }
}
class Input extends FieldElement {}
class Textarea extends FieldElement {}
class Select extends FieldElement {}
class RadioNodes extends Array {
    get value() {
        return this.find((input) => input.checked)?.value ?? "";
    }
}

export function createFieldDom(fields) {
    const headings = new Map();
    const wrappers = new Map();
    const counters = new Map();
    const inputs = new Map();
    for (const field of fields) {
        const heading = new FieldElement();
        heading.flags = [];
        heading.appendChild = (flag) => {
            heading.flags.push(flag);
            flag.remove = () =>
                heading.flags.splice(heading.flags.indexOf(flag), 1);
        };
        heading.querySelector = (selector) => {
            if (selector !== "[data-form-builder-required]")
                throw new Error(selector);
            return heading.flags[0] ?? null;
        };
        headings.set(field.name, heading);
        wrappers.set(field.name, new FieldElement());
        counters.set(field.name, new FieldElement());
        const Control =
            field.type === "textarea"
                ? Textarea
                : field.type === "select"
                  ? Select
                  : Input;
        const controls =
            field.type === "radio"
                ? RadioNodes.from(field.options, (option) =>
                      Object.assign(new Input(option.value), {
                          checked: option.selected === true,
                      }),
                  )
                : [new Control(field.value ?? "")];
        for (const input of controls) {
            input.type = field.type ?? "text";
            input.checked ??= field.value === "true";
            input.toggleAttribute("required", field.required === true);
        }
        inputs.set(field.name, field.type === "radio" ? controls : controls[0]);
    }
    const form = Object.assign(new EventTarget(), {
        elements: { namedItem: (name) => inputs.get(name) ?? null },
        querySelector(selector) {
            const name = selector.match(
                /data-form-builder-(?:field|char-counter)="([^"]+)"/,
            )?.[1];
            if (!name) return null;
            if (selector.endsWith(" .form-builder-label-heading"))
                return headings.get(name);
            if (selector.includes("char-counter")) return counters.get(name);
            return wrappers.get(name) ?? null;
        },
    });
    const globals = {
        HTMLElement: FieldElement,
        HTMLInputElement: Input,
        HTMLTextAreaElement: Textarea,
        HTMLSelectElement: Select,
        RadioNodeList: RadioNodes,
        CSS: { escape: (value) => value },
        document: {
            querySelector: () => ({}),
            createElement: () => new FieldElement(),
        },
    };
    return { form, inputs, headings, wrappers, counters, globals };
}
