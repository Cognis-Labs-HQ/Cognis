export class FakeElement {
    constructor(tagName) {
        this.tagName = String(tagName).toUpperCase();
        this.className = "";
        this.textContent = "";
        this.innerHTML = "";
        this.dataset = {};
        this.style = {};
        this.attributes = new Map();
        this.children = [];
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    setAttribute(name, value) {
        this.attributes.set(String(name), String(value));
    }

    getAttribute(name) {
        return this.attributes.get(String(name));
    }
}

export function createFakeDocument() {
    return {
        createElement(tagName) {
            return new FakeElement(tagName);
        },
    };
}
