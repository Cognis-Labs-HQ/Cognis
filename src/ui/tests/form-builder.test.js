import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFormBuilder } from "../reuse/form-builder.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function read(relativePath) {
    return readFileSync(resolve(ROOT, relativePath), "utf8");
}

test("form builder reuse utility exports createFormBuilder", () => {
    const source = read("src/ui/reuse/form-builder.js");
    assert.match(source, /export function createFormBuilder\(/);
    assert.match(source, /data-form-builder-floating=/);
    assert.match(source, /form-builder-criterion-item--met/);
    assert.match(source, /form-builder-required-flag/);
    assert.match(source, /form-builder-label-text/);
    assert.match(source, /aria-hidden="true"/);
});

test("form builder applies theme styling to every select control", () => {
    const builder = createFormBuilder(
        {
            i18n: { t: (key) => key },
            escapeHtml: (value) => String(value),
        },
        {
            formId: "theme-form",
            submitLabelKey: "submit",
            fields: [
                {
                    name: "visibility",
                    labelKey: "visibility",
                    type: "select",
                    options: [{ value: "friends", label: "Friends" }],
                },
            ],
        },
    );

    assert.match(builder.render(), /class="form-builder-input theme-select"/);
});

test("form builder keeps tooltip buttons outside field labels", () => {
    const builder = createFormBuilder(
        {
            i18n: { t: (key) => key },
            escapeHtml: (value) => String(value),
            renderInfoTooltip: () =>
                '<button type="button" class="info-tooltip__btn">i</button>',
        },
        {
            formId: "tooltip-form",
            submitLabelKey: "submit",
            fields: [
                {
                    name: "privateRepos",
                    labelKey: "private_repos",
                    type: "checkbox",
                    slider: true,
                    infoTooltip: { text: "permissions" },
                },
            ],
        },
    );
    const markup = builder.render();
    assert.match(
        markup,
        /<span class="form-builder-label-text"><label for="form-builder-privateRepos">/,
    );
    assert.match(markup, /<\/label><button[^>]*info-tooltip__btn/);
    assert.match(
        markup,
        /<label class="switch" for="form-builder-privateRepos"><input[\s\S]*<span class="slider"><\/span><\/label>/,
    );
});

test("module source fields retain balanced popup grid sizing", () => {
    const styles = read("src/ui/styles/modules.css");
    assert.match(styles, /\.module-source-form \.form-builder-field \{/);
    assert.match(
        styles,
        /\.module-source-form \.form-builder-field:nth-last-child\(-n \+ 2\) \{[\s\S]*grid-column: 1 \/ -1;/,
    );
});

test("adapter config form updates required title markers when requirements change", () => {
    const source = read("src/ui/app/administration/adapter-config-popup.js");
    const styles = read("src/ui/styles/reuse/page-sections.css");

    assert.match(source, /data-provider-required=/);
    assert.match(source, /requiredMarker\.hidden = !isRequired/);
    assert.match(source, /input\.toggleAttribute\("required", isRequired\)/);
    assert.match(
        source,
        /popupFormEl\.addEventListener\("input", \(\) => \{[\s\S]*updateRequiredHighlights\(\)/m,
    );
    assert.match(
        styles,
        /\.provider-required-flag[\s\S]*color: var\(--color-danger-outline-text\)/m,
    );
});

test("adapter environment warnings render beside headings in orange", () => {
    const source = read("src/ui/app/administration/adapter-config-popup.js");
    const styles = read("src/ui/styles/reuse/page-sections.css");
    const englishStrings = read("src/ui/languages/en/strings.xml");

    assert.match(
        source,
        /provider-field-title[^`]*\$\{requiredMarker\}\$\{conflictWarning\}<\/span>\$\{inputHtml\}/,
    );
    assert.match(
        styles,
        /\.provider-field-env-warning\s*\{[^}]*color: var\(--color-warning-outline-text, #f59e0b\)/,
    );
    assert.match(
        englishStrings,
        /name="ui\.app\.admin\.notif\.field_env_conflict">Overriding env variable</,
    );
});

test("adapter reset stages environment values until settings are saved", () => {
    const source = read("src/ui/app/administration/adapter-config-popup.js");

    assert.match(source, /loadConfigIntoForm\(popupFormEl, envData\)/);
    assert.match(source, /resetPending = true/);
    assert.match(
        source,
        /resetPending\s*\? \{ method: "DELETE" \}\s*: \{\s*method: "PUT"/,
    );
    assert.doesNotMatch(
        source,
        /if \(action === "reset"\) \{[\s\S]{0,300}apiFetch\(configUrl/,
    );
});

test("register page uses form builder instead of hardcoded maxlength for username", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(
        source,
        /import \{ createFormBuilder \} from "\/static\/reuse\/form-builder\.js";/,
    );
    assert.doesNotMatch(source, /maxlength="25"/);
    assert.match(
        source,
        /id: "username-max-length",[\s\S]*type: "maxLength",[\s\S]*value: REGISTER_USERNAME_MAX_CHARACTERS,/m,
    );
    assert.match(
        source,
        /name: "username",[\s\S]*maxCharacters: REGISTER_USERNAME_MAX_CHARACTERS/m,
    );
    assert.match(
        source,
        /name: "email",[\s\S]*maxCharacters: REGISTER_EMAIL_MAX_CHARACTERS/m,
    );
    assert.match(
        source,
        /name: "displayName",[\s\S]*maxCharacters: REGISTER_DISPLAY_NAME_MAX_CHARACTERS/m,
    );
});

test("register invite countdown uses a pill and auth cards size independently", () => {
    const registerSource = read("src/gateways/auth/ui/register.js");
    const authStyles = read("src/ui/styles/login.css");

    assert.match(
        registerSource,
        /id="register-countdown" class="auth-countdown-pill" aria-live="off"/,
    );
    assert.match(authStyles, /\.auth-layout \{[\s\S]*align-items: start;/m);
    assert.match(
        authStyles,
        /\.auth-countdown-pill \{[\s\S]*border-radius: 999px;/m,
    );
});

test("register form leaves field styling to the shared form builder", () => {
    const registerPage = read("src/ui/public/pages/register.html");
    const registerSource = read("src/gateways/auth/ui/register.js");

    assert.match(
        registerPage,
        /href="\/static\/styles\/reuse\/page-sections\.css"/,
    );
    assert.doesNotMatch(registerSource, /formClassName:\s*"auth-form"/);
});

test("register password criteria use floating alert in form builder config", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(source, /criteriaDisplay: "floating-alert"/);
    assert.match(
        source,
        /floatingTitleKey: "ui\.app\.register\.password_requirements"/,
    );
});

test("register username criteria use floating alert in form builder config", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(
        source,
        /floatingTitleKey: "ui\.app\.register\.username_requirements"/,
    );
});

test("register submit blocks when form builder marks fields invalid", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(source, /formController\.validateAll\(true\)/);
    assert.match(source, /ui\.app\.register\.error\.validation_failed/);
});

test("register username criterion allows only letters, digits, hyphens, and underscores", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(source, /id: "username-printable-ascii"/);
    assert.match(source, /\[a-zA-Z0-9_-\]/);
    assert.match(
        source,
        /username-printable-ascii[\s\S]*?value\.length === 0/m,
    );
});

test("register confirm password criterion only evaluates after password input", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(
        source,
        /const passwordValue = String\([\s\S]*values\?\.password \?\? ""[\s\S]*\)/m,
    );
    assert.match(source, /if \(passwordValue\.length === 0\)/);
    assert.match(source, /return null/);
    assert.match(source, /return value === passwordValue/);
    assert.match(source, /messageKey: "ui\.app\.register\.passwords_match"/);
});

test("form builder supports neutral custom criterion state via null", () => {
    const source = read("src/ui/reuse/form-builder.js");
    assert.match(source, /if \(criterionResult === null\)/);
    assert.match(
        source,
        /"form-builder-criterion-item--met",[\s\S]*criterionValid === true/m,
    );
    assert.match(
        source,
        /"form-builder-criterion-item--unmet",[\s\S]*criterionValid === false/m,
    );
});

test("form builder supports textarea fields and max character counters", () => {
    const source = read("src/ui/reuse/form-builder.js");
    assert.match(
        source,
        /type\?: 'text'\|'email'\|'password'\|'number'\|'url'\|'select'\|'textarea'/,
    );
    assert.match(source, /fieldConfig\.maxCharacters/);
    assert.match(source, /data-form-builder-char-counter=/);
    assert.match(source, /char-counter--near-limit/);
    assert.match(source, /char-counter--at-limit/);
});

test("form builder can omit its submit button when includeSubmitButton is false", () => {
    const source = read("src/ui/reuse/form-builder.js");
    assert.match(source, /includeSubmitButton/);
    assert.match(source, /options\?\.includeSubmitButton !== false/);
});

test("profile bio and post editors use form builder max-character fields", () => {
    const source = read("src/adapters/social/profile/ui/app.js");
    const renderSource = read(
        "src/adapters/social/profile/ui/profile-render.js",
    );
    assert.match(
        source,
        /import \{ createFormBuilder \} from "\/static\/reuse\/form-builder\.js";/,
    );
    assert.match(source, /PROFILE_BIO_MAX_CHARACTERS = 200/);
    assert.match(renderSource, /POST_CONTENT_MAX_CHARACTERS = 1000/);
    assert.match(source, /PROFILE_DISPLAY_NAME_MAX_CHARACTERS = 80/);
    assert.match(source, /PROFILE_LOCATION_MAX_CHARACTERS = 120/);
    assert.match(source, /PROFILE_WEBSITE_MAX_CHARACTERS = 2048/);
    assert.match(
        source,
        /name: "displayName",[\s\S]*maxCharacters: PROFILE_DISPLAY_NAME_MAX_CHARACTERS/m,
    );
    assert.match(
        source,
        /name: "bio",[\s\S]*maxCharacters: PROFILE_BIO_MAX_CHARACTERS/m,
    );
    assert.match(
        source,
        /name: "location",[\s\S]*maxCharacters: PROFILE_LOCATION_MAX_CHARACTERS/m,
    );
    assert.match(
        source,
        /name: "website",[\s\S]*maxCharacters: PROFILE_WEBSITE_MAX_CHARACTERS/m,
    );
    assert.match(
        renderSource,
        /name: "content",[\s\S]*type: "textarea",[\s\S]*maxCharacters: POST_CONTENT_MAX_CHARACTERS/m,
    );
    assert.match(source, /onOpen: \(overlay\) => \{/);
    assert.match(source, /profileEditFormBuilder\.attach\(popupFormElement\)/);
    assert.match(source, /bioPreviewElement\.id = "profile-edit-bio-preview"/);
    assert.match(renderSource, /id="profile-post-preview-toggle"/);
    assert.match(renderSource, /function renderComposerMarkdownPreview/);
    assert.match(source, /ui\.app\.profile\.bio_preview_placeholder/);
    assert.match(source, /ui\.app\.profile\.post_preview_placeholder/);
});

test("form builder updates textarea counters and captures edited values after attach", () => {
    class FakeClassList {
        #classes = new Set();

        toggle(className, shouldEnable) {
            const shouldAdd =
                shouldEnable === null || shouldEnable === undefined
                    ? !this.#classes.has(className)
                    : Boolean(shouldEnable);
            if (shouldAdd) {
                this.#classes.add(className);
            } else {
                this.#classes.delete(className);
            }
        }

        contains(className) {
            return this.#classes.has(className);
        }
    }

    class FakeHTMLElement {
        constructor() {
            this.classList = new FakeClassList();
            this.textContent = "";
        }
    }

    class FakeFieldElement extends FakeHTMLElement {
        constructor(value = "") {
            super();
            this.value = value;
            this.listeners = new Map();
        }

        addEventListener(eventType, listener) {
            const listeners = this.listeners.get(eventType) ?? [];
            listeners.push(listener);
            this.listeners.set(eventType, listeners);
        }

        emit(eventType) {
            const listeners = this.listeners.get(eventType) ?? [];
            for (const listener of listeners) {
                listener();
            }
        }
    }

    class FakeHTMLInputElement extends FakeFieldElement {}
    class FakeHTMLTextAreaElement extends FakeFieldElement {}
    class FakeHTMLSelectElement extends FakeFieldElement {}

    const originalHTMLElement = globalThis.HTMLElement;
    const originalHTMLInputElement = globalThis.HTMLInputElement;
    const originalHTMLTextAreaElement = globalThis.HTMLTextAreaElement;
    const originalHTMLSelectElement = globalThis.HTMLSelectElement;

    globalThis.HTMLElement = FakeHTMLElement;
    globalThis.HTMLInputElement = FakeHTMLInputElement;
    globalThis.HTMLTextAreaElement = FakeHTMLTextAreaElement;
    globalThis.HTMLSelectElement = FakeHTMLSelectElement;

    try {
        const formBuilder = createFormBuilder(
            {
                i18n: { t: (value) => value },
                escapeHtml: (value) => String(value),
            },
            {
                formId: "test-form",
                submitLabelKey: "ui.reuse.save",
                includeSubmitButton: false,
                fields: [
                    {
                        name: "bio",
                        labelKey: "ui.app.profile.bio",
                        type: "textarea",
                        value: "a",
                        maxCharacters: 5,
                    },
                ],
            },
        );
        const bioField = new FakeHTMLTextAreaElement("a");
        const bioCounter = new FakeHTMLElement();
        const bioFieldWrapper = new FakeHTMLElement();
        const fakeFormElement = {
            elements: {
                namedItem(fieldName) {
                    return fieldName === "bio" ? bioField : null;
                },
            },
            querySelector(selector) {
                if (selector === '[data-form-builder-char-counter="bio"]') {
                    return bioCounter;
                }
                if (selector === '[data-form-builder-field="bio"]') {
                    return bioFieldWrapper;
                }
                return null;
            },
        };

        const formController = formBuilder.attach(fakeFormElement);
        assert.equal(bioCounter.textContent, "1 / 5");

        bioField.value = "abcd";
        bioField.emit("input");
        assert.equal(bioCounter.textContent, "4 / 5");
        assert.equal(bioField.value, "abcd");
        assert.equal(
            bioCounter.classList.contains("char-counter--near-limit"),
            true,
        );
        assert.equal(
            bioCounter.classList.contains("char-counter--at-limit"),
            false,
        );

        bioField.value = "abcdef";
        bioField.emit("input");
        assert.equal(bioField.value, "abcde");
        assert.equal(bioCounter.textContent, "5 / 5");
        assert.equal(
            bioCounter.classList.contains("char-counter--at-limit"),
            true,
        );
        assert.equal(formController.getValues().bio, "abcde");
    } finally {
        globalThis.HTMLElement = originalHTMLElement;
        globalThis.HTMLInputElement = originalHTMLInputElement;
        globalThis.HTMLTextAreaElement = originalHTMLTextAreaElement;
        globalThis.HTMLSelectElement = originalHTMLSelectElement;
    }
});

test("register confirm password revalidates reactively when password changes", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(
        source,
        /bindConfirmPasswordRevalidation\(\{\s*form,\s*formController,\s*passwordFieldName:\s*"password",\s*confirmFieldName:\s*"confirmPassword",/m,
    );
});
