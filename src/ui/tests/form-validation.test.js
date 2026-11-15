import test from "node:test";
import assert from "node:assert/strict";
import {
    createFormBuilder,
    bindTabbedFormValidation,
} from "../reuse/form-builder.js";
import { escapeHtml } from "../reuse/escape-html.js";
import {
    formValidationFixture,
    lowercaseField,
    descriptions,
} from "./fixtures/form-validation.js";

for (const locale of ["en", "de", "id", "ja"]) {
    test(`evaluated invalid fields describe localized criteria and recover: ${locale}`, async (context) => {
        const host = await formValidationFixture(context, locale);
        const { form, controller } = host.mount([
            lowercaseField({ required: true }),
        ]);
        const control = form.elements.namedItem("username");
        const criterion = form.querySelector("[data-form-builder-criterion]");
        assert.equal(control.getAttribute("aria-invalid"), null);
        assert.deepEqual(descriptions(control), []);
        assert.equal(
            criterion.textContent,
            host.i18n.t("ui.app.register.error.username_not_lowercase"),
        );
        host.input(form, "username", "BAD USER!");
        assert.equal(controller.validateAll(true), false);
        assert.equal(
            control.checkValidity(),
            true,
            "Custom criteria must not change native submission policy",
        );
        assert.equal(control.getAttribute("aria-invalid"), "true");
        assert.ok(criterion.id);
        assert.deepEqual(descriptions(control), [criterion.id]);
        assert.equal(host.document.getElementById(criterion.id), criterion);
        assert.equal(
            control.classList.contains("form-builder-input--invalid"),
            true,
        );
        assert.equal(controller.validateAll(true), false);
        assert.deepEqual(descriptions(control), [criterion.id]);
        host.input(form, "username", "learner");
        assert.equal(controller.validateAll(true), true);
        assert.equal(control.getAttribute("aria-invalid"), null);
        assert.deepEqual(descriptions(control), []);
        assert.equal(
            control.classList.contains("form-builder-input--invalid"),
            false,
        );
    });
}

test("multiple failed criteria preserve existing and later description tokens", async (context) => {
    const host = await formValidationFixture(context);
    const field = lowercaseField({
        attributes: {
            "aria-describedby": "help caller-error",
            "aria-invalid": "grammar",
        },
    });
    field.criteria.push({
        id: "short",
        type: "maxLength",
        value: 25,
        messageKey: "ui.app.register.error.username_too_long",
    });
    const { form, controller } = host.mount([field]);
    const control = host.input(form, "username", "LONG".repeat(8));
    const criteria = [
        ...form.querySelectorAll("[data-form-builder-criterion]"),
    ];
    assert.deepEqual(descriptions(control), [
        "help",
        "caller-error",
        ...criteria.map((entry) => entry.id),
    ]);
    control.setAttribute(
        "aria-describedby",
        `${control.getAttribute("aria-describedby")} new-help`,
    );
    host.input(form, "username", "long".repeat(8));
    assert.deepEqual(descriptions(control), [
        "help",
        "caller-error",
        "new-help",
        criteria[1].id,
    ]);
    host.input(form, "username", "ok");
    assert.equal(controller.validateAll(true), true);
    assert.deepEqual(descriptions(control), [
        "help",
        "caller-error",
        "new-help",
    ]);
    assert.equal(control.getAttribute("aria-invalid"), "grammar");
});

test("initial, untouched, null and optional-empty states retain existing evaluation rules", async (context) => {
    const host = await formValidationFixture(context);
    const { form, controller } = host.mount([
        lowercaseField({ name: "required", required: true }),
        lowercaseField({ name: "optional" }),
        lowercaseField({
            name: "neutral",
            criteria: [
                {
                    id: "pending",
                    type: "custom",
                    test: () => null,
                    messageKey: "ui.reuse.passwords_match",
                },
            ],
        }),
    ]);
    assert.equal(controller.validateField("required"), false);
    assert.equal(form.elements.required.getAttribute("aria-invalid"), null);
    assert.equal(controller.validateField("optional"), true);
    assert.equal(form.elements.optional.getAttribute("aria-invalid"), null);
    assert.equal(controller.validateField("neutral", true), true);
    assert.equal(form.elements.neutral.getAttribute("aria-invalid"), null);
    assert.equal(controller.validateField("required", true), false);
    assert.equal(form.elements.required.getAttribute("aria-invalid"), "true");
    assert.equal(
        controller.validateField("optional", true),
        false,
        "Existing custom criterion still evaluates touched optional blanks",
    );
    assert.equal(form.elements.optional.getAttribute("aria-invalid"), "true");
    host.input(form, "required", "valid");
    assert.equal(controller.setFieldRequired("required", false), true);
    assert.equal(form.elements.required.required, false);
    assert.equal(
        form.querySelector('[data-form-builder-required="required"]'),
        null,
    );
});

test("rendered criteria stay unique across repeated renders and matching form names", async (context) => {
    const host = await formValidationFixture(context);
    const first = host.mount([lowercaseField()]);
    const second = host.mount([lowercaseField()]);
    const repeated = host.document.createElement("section");
    repeated.innerHTML = first.builder.render();
    host.document.body.append(repeated);
    const thirdForm = repeated.querySelector("form");
    const thirdController = first.builder.attach(thirdForm);
    context.after(() => thirdController.detach());
    const ids = [
        ...host.document.querySelectorAll("[data-form-builder-criterion]"),
    ].map((entry) => entry.id);
    assert.equal(new Set(ids).size, 3);
    for (const form of [first.form, second.form, thirdForm]) {
        const control = host.input(form, "username", "INVALID");
        assert.equal(
            host.document
                .getElementById(descriptions(control)[0])
                .closest("form"),
            form,
        );
    }
});

for (const type of ["select", "textarea", "radio"]) {
    test(`custom invalid state belongs to the supported ${type} controls`, async (context) => {
        const host = await formValidationFixture(context);
        const { form, controller } = host.mount([
            lowercaseField({
                type,
                options: [
                    { value: "BAD", label: "BAD" },
                    { value: "good", label: "good" },
                ],
            }),
        ]);
        const controls = [...form.querySelectorAll("input, select, textarea")];
        if (type === "radio") {
            controls[0].checked = true;
            controls[0].dispatchEvent(
                new host.window.Event("change", { bubbles: true }),
            );
        } else host.input(form, "username", "BAD", "change");
        assert.equal(controller.validateAll(true), false);
        for (const control of controls) {
            assert.equal(control.getAttribute("aria-invalid"), "true");
            assert.equal(descriptions(control).length, 1);
        }
        if (type === "radio") {
            controls[1].checked = true;
            controls[1].dispatchEvent(
                new host.window.Event("change", { bubbles: true }),
            );
        } else host.input(form, "username", "good", "change");
        assert.equal(controller.validateAll(true), true);
        for (const control of controls)
            assert.equal(control.getAttribute("aria-invalid"), null);
    });
}

test("disabled and hidden controls keep controller policy without changing native constraints", async (context) => {
    const host = await formValidationFixture(context);
    const { form, controller } = host.mount([
        lowercaseField({ disabled: true }),
        lowercaseField({ name: "hidden", attributes: { hidden: true } }),
    ]);
    for (const name of ["username", "hidden"]) {
        const control = form.elements.namedItem(name);
        control.value = "BAD";
        assert.equal(controller.validateField(name, true), false);
        assert.equal(control.getAttribute("aria-invalid"), "true");
        assert.equal(control.checkValidity(), true);
    }
    assert.equal(form.elements.username.disabled, true);
    assert.equal(form.elements.hidden.hidden, true);
});

test("tab navigation retains native validity policy and existing criteria associations", async (context) => {
    const host = await formValidationFixture(context);
    const { form } = host.mount([lowercaseField()]);
    const firstPanel = host.document.createElement("div");
    firstPanel.dataset.formPanel = "first";
    firstPanel.append(form.querySelector("[data-form-builder-field]"));
    const secondPanel = host.document.createElement("div");
    secondPanel.dataset.formPanel = "second";
    form.append(firstPanel, secondPanel);
    const tabs = bindTabbedFormValidation(form);
    const control = host.input(form, "username", "BAD");
    const ids = descriptions(control);
    tabs.activate("second");
    assert.equal(firstPanel.hidden, true);
    assert.deepEqual([...tabs.refresh()], []);
    assert.equal(tabs.revealFirstInvalid(), false);
    tabs.activate("first");
    assert.equal(firstPanel.hidden, false);
    assert.deepEqual(descriptions(control), ids);
    assert.equal(control.getAttribute("aria-invalid"), "true");
});

test("submit cancellation remains observable to component handlers and never changes native validity", async (context) => {
    const host = await formValidationFixture(context);
    const { form, controller } = host.mount([lowercaseField()]);
    host.input(form, "username", "BAD");
    let submitted = 0;
    form.addEventListener("submit", (event) => {
        submitted++;
        assert.equal(event.defaultPrevented, true);
        assert.equal(controller.validateAll(true), false);
    });
    assert.equal(form.checkValidity(), true);
    form.requestSubmit();
    assert.equal(submitted, 1);
    const implicitSubmission = new host.window.Event("submit", {
        cancelable: true,
    });
    form.dispatchEvent(implicitSubmission);
    assert.equal(implicitSubmission.defaultPrevented, true);
    assert.equal(submitted, 2);
});

for (const disposal of ["detach", "abort"]) {
    test(`${disposal} clears owned attributes and stops validation listeners before reattachment`, async (context) => {
        const host = await formValidationFixture(context);
        const owner = new host.window.AbortController();
        let evaluations = 0;
        const field = lowercaseField({
            attributes: { "aria-describedby": "caller" },
        });
        field.criteria[0].test = (value) => {
            evaluations++;
            return value === "good";
        };
        const { builder, form, controller } = host.mount(
            [field],
            {},
            { signal: owner.signal },
        );
        const control = host.input(form, "username", "bad");
        assert.equal(control.getAttribute("aria-invalid"), "true");
        if (disposal === "detach") controller.detach();
        else owner.abort();
        assert.equal(control.getAttribute("aria-invalid"), null);
        assert.deepEqual(descriptions(control), ["caller"]);
        const before = evaluations;
        for (const event of ["input", "change", "blur"])
            host.input(form, "username", "bad", event);
        assert.equal(evaluations, before);
        controller.detach();
        const reattached = builder.attach(form);
        host.input(form, "username", "bad");
        assert.equal(evaluations, before + 1);
        assert.equal(control.getAttribute("aria-invalid"), "true");
        reattached.detach();
        assert.deepEqual(descriptions(control), ["caller"]);
    });
}

test("criterion text uses English fallback and missing messages fail explicitly", async (context) => {
    const host = await formValidationFixture(context, "zz");
    const { form } = host.mount([lowercaseField()]);
    assert.equal(
        form.querySelector("[data-form-builder-criterion]").textContent,
        "Username must be all lowercase.",
    );
    const field = lowercaseField();
    field.criteria[0].messageKey = "ui.reuse.nonexistent_validation_fixture";
    assert.throws(
        () =>
            createFormBuilder(
                { i18n: host.i18n, escapeHtml },
                { formId: "missing", fields: [field] },
            ).render(),
        /missing_translation:ui.reuse.nonexistent_validation_fixture/,
    );
});

test("detached input change and blur events cannot reevaluate a field", async (context) => {
    const host = await formValidationFixture(context);
    let evaluations = 0;
    const field = lowercaseField();
    field.criteria[0].test = (value) => {
        evaluations++;
        return value === "good";
    };
    const { form, controller } = host.mount([field]);
    host.input(form, "username", "bad");
    const before = evaluations;
    controller.detach();
    for (const event of ["input", "change", "blur"])
        host.input(form, "username", "good", event);
    assert.equal(evaluations, before);
    assert.equal(
        controller.validateField("username", true),
        true,
        "Explicit controller evaluation stays available after detach",
    );
    assert.equal(evaluations, before + 1);
});

test("an already aborted attachment installs no active validation listeners", async (context) => {
    const host = await formValidationFixture(context);
    const owner = new host.window.AbortController();
    owner.abort();
    let evaluations = 0;
    const field = lowercaseField();
    field.criteria[0].test = () => {
        evaluations++;
        return false;
    };
    const { form } = host.mount([field], {}, { signal: owner.signal });
    for (const event of ["input", "change", "blur"])
        host.input(form, "username", "bad", event);
    assert.equal(evaluations, 0);
    assert.equal(form.elements.username.getAttribute("aria-invalid"), null);
});

test("caller-owned criterion references and later ARIA errors survive cleanup", async (context) => {
    const host = await formValidationFixture(context);
    const { form, controller } = host.mount([
        lowercaseField({ attributes: { "aria-errormessage": "server-error" } }),
    ]);
    const control = form.elements.username;
    const criterion = form.querySelector("[data-form-builder-criterion]");
    control.setAttribute("aria-describedby", `help ${criterion.id}`);
    host.input(form, "username", "BAD");
    assert.deepEqual(descriptions(control), ["help", criterion.id]);
    control.setAttribute("aria-invalid", "spelling");
    controller.detach();
    assert.deepEqual(descriptions(control), ["help", criterion.id]);
    assert.equal(control.getAttribute("aria-invalid"), "spelling");
    assert.equal(control.getAttribute("aria-errormessage"), "server-error");
});

for (const cleanup of ["correction", "detach", "abort"]) {
    for (const replacement of ["spelling", "false", null]) {
        test(`latest caller ARIA replacement ${replacement} survives repeated validation and ${cleanup}`, async (context) => {
            const host = await formValidationFixture(context);
            const owner = new host.window.AbortController();
            const { form, controller } = host.mount(
                [
                    lowercaseField({
                        attributes: {
                            "aria-invalid": "grammar",
                            "aria-describedby": "caller-help",
                        },
                    }),
                ],
                {},
                { signal: owner.signal },
            );
            const control = host.input(form, "username", "BAD");
            control.setAttribute("aria-invalid", "spelling");
            host.input(form, "username", "STILLBAD", "change");
            if (replacement === null) control.removeAttribute("aria-invalid");
            else control.setAttribute("aria-invalid", replacement);
            assert.equal(controller.validateField("username", true), false);
            assert.equal(controller.validateField("username", true), false);
            assert.equal(control.getAttribute("aria-invalid"), "true");
            if (cleanup === "correction") host.input(form, "username", "good");
            else if (cleanup === "detach") controller.detach();
            else owner.abort();
            assert.equal(control.getAttribute("aria-invalid"), replacement);
            assert.deepEqual(descriptions(control), ["caller-help"]);
        });
    }
}

for (const original of ["true", "grammar"]) {
    test(`original caller aria-invalid=${original} survives unmodified repeated evaluation`, async (context) => {
        const host = await formValidationFixture(context);
        const { form, controller } = host.mount([
            lowercaseField({ attributes: { "aria-invalid": original } }),
        ]);
        host.input(form, "username", "BAD");
        assert.equal(controller.validateAll(true), false);
        host.input(form, "username", "good");
        assert.equal(
            form.elements.username.getAttribute("aria-invalid"),
            original,
        );
        controller.detach();
        assert.equal(
            form.elements.username.getAttribute("aria-invalid"),
            original,
        );
    });
}

for (const cleanup of ["detach", "abort"]) {
    for (const result of [false, true, null]) {
        test(`${cleanup} during a ${result} criterion prevents stale presentation writes`, async (context) => {
            const host = await formValidationFixture(context);
            const owner = new host.window.AbortController();
            let disposeDuringEvaluation;
            let evaluations = 0;
            const field = lowercaseField({
                attributes: {
                    "aria-describedby": "caller-help",
                    "aria-invalid": "grammar",
                },
            });
            field.criteria[0].test = () => {
                evaluations++;
                disposeDuringEvaluation();
                return result;
            };
            const { form, controller } = host.mount(
                [field],
                {},
                { signal: owner.signal },
            );
            const criterion = form.querySelector(
                "[data-form-builder-criterion]",
            );
            const control = form.elements.username;
            const wrapper = form.querySelector("[data-form-builder-field]");
            let cleanedPresentation;
            disposeDuringEvaluation = () => {
                if (cleanup === "detach") controller.detach();
                else owner.abort();
                criterion.remove();
                cleanedPresentation = {
                    criterion: criterion.className,
                    control: control.className,
                    wrapper: wrapper.className,
                };
            };
            control.value = "BAD";
            assert.equal(
                controller.validateField("username", true),
                result !== false,
            );
            assert.equal(evaluations, 1);
            assert.equal(control.getAttribute("aria-invalid"), "grammar");
            assert.deepEqual(descriptions(control), ["caller-help"]);
            assert.deepEqual(
                {
                    criterion: criterion.className,
                    control: control.className,
                    wrapper: wrapper.className,
                },
                cleanedPresentation,
            );
            for (const event of ["input", "change", "blur"])
                host.input(form, "username", "BAD", event);
            assert.equal(evaluations, 1);
        });
    }

    test(`validateAll shares its ${cleanup} boundary across later fields`, async (context) => {
        const host = await formValidationFixture(context);
        const owner = new host.window.AbortController();
        let disposeDuringEvaluation;
        const first = lowercaseField({ name: "first" });
        first.criteria[0].test = () => {
            disposeDuringEvaluation();
            return true;
        };
        const { form, controller } = host.mount(
            [first, lowercaseField({ name: "second" })],
            {},
            { signal: owner.signal },
        );
        disposeDuringEvaluation =
            cleanup === "detach" ? controller.detach : () => owner.abort();
        form.elements.first.value = "good";
        form.elements.second.value = "BAD";
        assert.equal(controller.validateAll(true), false);
        for (const control of form.querySelectorAll("input")) {
            assert.equal(control.getAttribute("aria-invalid"), null);
            assert.deepEqual(descriptions(control), []);
            assert.equal(
                control.classList.contains("form-builder-input--invalid"),
                false,
            );
        }
        assert.equal(
            controller.validateField("second", true),
            false,
            "A deliberate invocation after completed cleanup starts a new evaluation",
        );
        assert.equal(form.elements.second.getAttribute("aria-invalid"), "true");
        controller.detach();
        assert.equal(form.elements.second.getAttribute("aria-invalid"), null);
    });

    test(`explicit evaluation after ${cleanup} can be invalidated by another detach`, async (context) => {
        const host = await formValidationFixture(context);
        const owner = new host.window.AbortController();
        let shouldDetach = false;
        let controller;
        const field = lowercaseField();
        field.criteria[0].test = () => {
            if (shouldDetach) controller.detach();
            return false;
        };
        const mounted = host.mount([field], {}, { signal: owner.signal });
        controller = mounted.controller;
        if (cleanup === "detach") controller.detach();
        else owner.abort();
        mounted.form.elements.username.value = "BAD";
        assert.equal(controller.validateField("username", true), false);
        assert.equal(
            mounted.form.elements.username.getAttribute("aria-invalid"),
            "true",
        );
        shouldDetach = true;
        assert.equal(controller.validateField("username", true), false);
        assert.equal(
            mounted.form.elements.username.getAttribute("aria-invalid"),
            null,
        );
        assert.deepEqual(descriptions(mounted.form.elements.username), []);
    });
}
