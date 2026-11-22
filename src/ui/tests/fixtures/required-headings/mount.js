import { createFormBuilder } from "/static/reuse/form-builder.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

const root = document.getElementById("fixture");
let owner;
let controller;

function mount() {
    owner?.abort();
    controller?.detach();
    owner = new AbortController();
    const builder = createFormBuilder(
        { i18n: { t: String }, escapeHtml },
        {
            formId: "headings",
            formClassName: "share-links-create-form",
            includeSubmitButton: false,
            fields: [
                {
                    name: "password",
                    type: "password",
                    label: "Password Protection",
                    required: true,
                },
                {
                    name: "longEnglish",
                    label: "A deliberately long field heading with several words to wrap across a narrow form",
                    required: true,
                },
                {
                    name: "longGerman",
                    label: "Datenschutzeinstellungen".repeat(6),
                    required: true,
                },
                {
                    name: "japanese",
                    label: "新しい共有リンクのパスワード保護設定".repeat(6),
                    required: true,
                },
                {
                    name: "indonesian",
                    type: "textarea",
                    label: "Pengaturan perlindungan kata sandi untuk tautan bersama",
                    required: true,
                    maxCharacters: 10,
                },
                {
                    name: "consent",
                    type: "checkbox",
                    slider: true,
                    labelHtml: 'Accept the <a href="#fixture">terms</a>',
                    required: true,
                },
                {
                    name: "choice",
                    type: "select",
                    label: "Choice",
                    required: true,
                    options: [
                        { value: "", label: "Choose" },
                        { value: "yes", label: "Yes" },
                    ],
                },
                {
                    name: "radio",
                    type: "radio",
                    label: "Visibility",
                    required: true,
                    options: [
                        { value: "private", label: "Private" },
                        { value: "public", label: "Public" },
                    ],
                },
                {
                    name: "secret",
                    secret: true,
                    label: "Secret",
                    required: true,
                },
            ],
        },
    );
    root.innerHTML = builder.render();
    controller = builder.attach(document.getElementById("headings"), {
        signal: owner.signal,
    });
    window.fixture.controller = controller;
}

window.fixture = { mount };
try {
    mount();
} catch (error) {
    window.fixture.error = error.message;
}
