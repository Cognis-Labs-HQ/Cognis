import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import {
    mountHorizontalCarousels,
    renderHorizontalCarousel,
} from "/static/reuse/horizontal-carousel.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import {
    requestLibraryUpdate,
    updateLibraryEntry,
} from "/static/gateways/study/ui/library-client.js";
import {
    definitionText,
    layerForEntry,
    localizedLabel,
} from "./presentation.js";
import { entryEditMode } from "./editability.js";

export function inputForField(field, value, language, i18n) {
    const label = localizedLabel(field.metadata, language);
    const name = `field:${field.id}`;
    const control = field.input?.control;
    const options = field.input?.options ?? [];
    if (field.type === "strokePattern")
        return `<input name="${escapeHtml(name)}" type="hidden" data-library-provider-field>`;
    if (control === "audioFile") {
        const namespace = field.input?.file?.namespace ?? "";
        const prefix = field.input?.file?.prefix ?? `${language}/`;
        const filename =
            typeof value === "string" && value.startsWith("file:")
                ? value.slice("file:".length).split("/").at(-1)
                : "";
        return `<label class="library-audio-field" data-library-audio-field data-field-id="${escapeHtml(field.id)}" data-namespace="${escapeHtml(namespace)}" data-prefix="${escapeHtml(prefix)}"><span>${escapeHtml(label)} (${escapeHtml(i18n.t("gateway.study.library_optional"))})</span><span class="library-audio-filename" data-library-audio-filename${filename ? "" : " hidden"}>${escapeHtml(filename)}</span><input name="${escapeHtml(name)}" type="hidden" value="${escapeHtml(value ?? "")}"><input type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/webm,audio/mp4"></label>`;
    }
    if (control === "singleSelect" || control === "multiSelect")
        return `<label><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}"${control === "multiSelect" ? " multiple" : ""}${field.input?.immutable ? " disabled" : ""}${field.required ? " required" : ""}>${options.map((option) => `<option value="${escapeHtml(option.value)}"${(Array.isArray(value) ? value.includes(option.value) : value === option.value) ? " selected" : ""}>${escapeHtml(localizedLabel(option.metadata, language))}</option>`).join("")}</select></label>`;
    const valueKind = field.validation?.kind ?? field.type;
    if (valueKind === "boolean")
        return `<label class="library-admin-checkbox"><input name="${escapeHtml(name)}" type="checkbox" class="choice-checkbox"${value === true ? " checked" : ""}> <span>${escapeHtml(label)}</span></label>`;
    if (valueKind === "localizedText") {
        const translations =
            value && typeof value === "object" && !Array.isArray(value)
                ? value
                : {};
        const uiLanguages = ["de", "en", "id", "ja"];
        return `<fieldset class="library-admin-localized-field"><legend>${escapeHtml(label)}</legend>${uiLanguages
            .map((locale) => [locale, translations[locale] ?? ""])
            .map(
                ([locale, text]) =>
                    `<label><span>${escapeHtml(locale)}</span><input name="${escapeHtml(`${name}:${locale}`)}" value="${escapeHtml(String(text))}"${field.required ? " required" : ""}></label>`,
            )
            .join("")}</fieldset>`;
    }
    if (
        field.type === "stringList" ||
        field.validation?.kind === "list" ||
        control === "tagList"
    )
        return `<div class="library-tag-field" data-library-tag-field><span>${escapeHtml(label)}</span><div class="library-tag-list">${(Array.isArray(value) ? value : []).map((item) => `<button type="button" class="btn-neutral" data-library-tag="${escapeHtml(item)}">${escapeHtml(item)} ×</button>`).join("")}</div><input data-library-tag-input aria-label="${escapeHtml(label)}"><input name="${escapeHtml(name)}" type="hidden" value="${escapeHtml((Array.isArray(value) ? value : []).join("\u001f"))}"${field.required ? " required" : ""}></div>`;
    const inputType =
        ["number", "integer"].includes(field.type) ||
        field.validation?.kind === "number" ||
        control === "number"
            ? "number"
            : "text";
    const step =
        field.type === "integer" || field.validation?.integer ? "1" : "any";
    return `<label><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" type="${inputType}"${inputType === "number" ? ` step="${step}"` : ""} value="${escapeHtml(value ?? "")}"${field.required ? " required" : ""}${field.input?.immutable ? " disabled" : ""}></label>`;
}

export function bindLibraryEditorControls(form, entry, i18n) {
    form.querySelectorAll("[data-library-provider-field]").forEach(
        (control) => {
            const fieldId = control.name.slice("field:".length);
            control.libraryFieldValue = entry.fields?.[fieldId];
        },
    );
    const activateTab = (tabId) => {
        form.querySelectorAll("[data-library-editor-tab]").forEach((button) => {
            const active = button.dataset.libraryEditorTab === tabId;
            button.classList.toggle("active", active);
            button.setAttribute("aria-selected", String(active));
        });
        form.querySelectorAll("[data-library-editor-panel]").forEach(
            (panel) => {
                panel.hidden = panel.dataset.libraryEditorPanel !== tabId;
            },
        );
    };
    form.querySelector("[data-library-editor-tabs]")?.addEventListener(
        "click",
        (event) => {
            const tab = event.target.closest("[data-library-editor-tab]");
            if (tab) activateTab(tab.dataset.libraryEditorTab);
        },
    );
    form.addEventListener(
        "invalid",
        (event) => {
            const panel = event.target.closest("[data-library-editor-panel]");
            if (panel) activateTab(panel.dataset.libraryEditorPanel);
        },
        true,
    );
    form.querySelectorAll("select[multiple]").forEach((select) => {
        select.addEventListener("mousedown", (event) => {
            if (event.target.tagName !== "OPTION") return;
            event.preventDefault();
            event.target.selected = !event.target.selected;
            select.dispatchEvent(new Event("change", { bubbles: true }));
        });
    });
    form.querySelectorAll("[data-library-audio-field]").forEach((field) => {
        const client = uiCtx.capabilities.get("files:uiClient");
        const stored = field.querySelector('input[type="hidden"]');
        const picker = field.querySelector('input[type="file"]');
        const filename = field.querySelector("[data-library-audio-filename]");
        if (!client) return;
        picker.addEventListener("change", async () => {
            const file = picker.files?.[0];
            if (!file) return;
            const identity =
                String(form.elements.label?.value || entry.id)
                    .normalize("NFKC")
                    .toLocaleLowerCase()
                    .replace(/[^\p{L}\p{N}]+/gu, "-")
                    .replace(/^-|-$/g, "") || "card";
            const cardIdentifier = String(entry.id || identity)
                .normalize("NFKC")
                .replace(/[^\p{L}\p{N}._-]+/gu, "-")
                .replace(/^-|-$/g, "");
            const key = `${field.dataset.prefix}${cardIdentifier}-${field.dataset.fieldId}.audio`;
            field.dataset.uploading = "true";
            picker.disabled = true;
            try {
                await client.uploadAudio(field.dataset.namespace, key, file);
                stored.value = `file:${key}`;
                filename.textContent = file.name;
                filename.hidden = false;
                showToast(
                    i18n.t("gateway.study.library_audio_upload_success"),
                    {
                        variant: "success",
                    },
                );
            } catch {
                showToast(i18n.t("gateway.study.library_audio_upload_error"), {
                    variant: "error",
                });
            } finally {
                delete field.dataset.uploading;
                picker.disabled = false;
            }
        });
    });
    form.querySelectorAll("[data-library-tag-field]").forEach((field) => {
        const input = field.querySelector("[data-library-tag-input]");
        const hidden = field.querySelector('input[type="hidden"]');
        const list = field.querySelector(".library-tag-list");
        const values = () =>
            Array.from(
                list.querySelectorAll("[data-library-tag]"),
                (tag) => tag.dataset.libraryTag,
            );
        list.addEventListener("click", (event) => {
            const tag = event.target.closest("[data-library-tag]");
            if (!tag) return;
            tag.remove();
            hidden.value = values().join("\u001f");
        });
        input.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
            const value = input.value.trim();
            if (!value || values().includes(value)) return;
            const tag = document.createElement("button");
            tag.type = "button";
            tag.className = "btn-neutral";
            tag.dataset.libraryTag = value;
            tag.textContent = `${value} ×`;
            list.append(tag);
            hidden.value = values().join("\u001f");
            input.value = "";
        });
    });
}

function mountEditableRelationshipCarousels(
    form,
    overlay,
    entries,
    schema,
    layer,
) {
    const pronunciationRelationshipIds = new Set(
        layer.fields?.find(({ id }) => id === "pronunciation")?.input
            ?.linkRelationships ?? [],
    );
    pronunciationRelationshipsFor(
        layer,
        schema,
        pronunciationRelationshipIds,
    ).forEach(({ id }) => pronunciationRelationshipIds.add(id));
    const controller = new AbortController();
    const committedValues = new Map();
    const draftValues = new Map();
    pronunciationRelationshipIds.forEach((relationshipId) => {
        const select = form.elements[`relationship:${relationshipId}`];
        committedValues.set(
            relationshipId,
            new Set(
                Array.from(select?.selectedOptions ?? [], (option) =>
                    String(option.value),
                ),
            ),
        );
        draftValues.set(relationshipId, []);
    });
    overlay.addEventListener("close", () => controller.abort(), { once: true });
    mountHorizontalCarousels(form, {
        signal: controller.signal,
        onChange: ({ id, values }) => {
            const select = form.elements[`relationship:${id}`];
            if (!select) return;
            if (pronunciationRelationshipIds.has(id))
                draftValues.set(id, values);
            const selected = new Set([
                ...(committedValues.get(id) ?? []),
                ...values,
            ]);
            Array.from(select.options).forEach((option) => {
                option.selected = selected.has(option.value);
            });
            values.forEach((value) => {
                const option = Array.from(select.options).find(
                    (candidate) => candidate.value === value,
                );
                if (option) select.append(option);
            });
            const pronunciation = form.elements["field:pronunciation"];
            if (pronunciation && pronunciationRelationshipIds.has(id)) {
                const current = form.querySelector(
                    "[data-library-pronunciation-current]",
                );
                const pronunciationValue = Array.from(
                    pronunciationRelationshipIds,
                )
                    .flatMap(
                        (relationshipId) =>
                            draftValues.get(relationshipId) ?? [],
                    )
                    .map((value) =>
                        entries.find((candidate) => candidate.id === value),
                    )
                    .filter(Boolean)
                    .map((candidate) => {
                        const candidatePronunciation =
                            candidate.fields?.pronunciation;
                        return (
                            (Array.isArray(candidatePronunciation)
                                ? candidatePronunciation[0]
                                : candidatePronunciation) || candidate.label
                        );
                    })
                    .join("");
                if (current) current.textContent = pronunciationValue;
            }
        },
    });
    pronunciationRelationshipIds.forEach((relationshipId) => {
        const carousel = form.querySelector(
            `[data-horizontal-carousel="${CSS.escape(relationshipId)}"]`,
        );
        carousel?.querySelectorAll("[data-carousel-value]").forEach((item) => {
            item.classList.remove("is-selected");
            item.setAttribute("aria-pressed", "false");
            item.querySelector("[data-carousel-order]").textContent = "";
        });
        const output = carousel?.querySelector("[data-carousel-selection]");
        if (output) output.textContent = "";
    });
    form.querySelectorAll("[data-library-pronunciation-commit]").forEach(
        (button) => {
            button.addEventListener("click", () => {
                const pronunciation = form.elements["field:pronunciation"];
                const current = form.querySelector(
                    "[data-library-pronunciation-current]",
                );
                const value = current?.textContent?.trim();
                if (!pronunciation || !value) return;
                const values = pronunciation.value
                    .split("\u001f")
                    .filter(Boolean);
                if (!values.includes(value)) values.push(value);
                pronunciation.value = values.join("\u001f");
                const list = form.querySelector(
                    "[data-library-pronunciation-values]",
                );
                if (
                    list &&
                    !list.querySelector(`[data-value="${CSS.escape(value)}"]`)
                ) {
                    const item = document.createElement("span");
                    item.dataset.value = value;
                    item.textContent = value;
                    list.append(item);
                }
                pronunciationRelationshipIds.forEach((relationshipId) => {
                    const committed = committedValues.get(relationshipId);
                    (draftValues.get(relationshipId) ?? []).forEach((entryId) =>
                        committed.add(entryId),
                    );
                    draftValues.set(relationshipId, []);
                    const carousel = form.querySelector(
                        `[data-horizontal-carousel="${CSS.escape(relationshipId)}"]`,
                    );
                    carousel
                        ?.querySelectorAll("[data-carousel-value]")
                        .forEach((item) => {
                            item.classList.remove("is-selected");
                            item.setAttribute("aria-pressed", "false");
                            item.querySelector(
                                "[data-carousel-order]",
                            ).textContent = "";
                        });
                    const output = carousel?.querySelector(
                        "[data-carousel-selection]",
                    );
                    if (output) output.textContent = "";
                });
                current.textContent = "";
            });
        },
    );
}

function pronunciationRelationshipsFor(layer, schema, configuredIds) {
    const targetRoles =
        layer?.semanticRole === "orderedLexicalSequence"
            ? new Set(["lexicalUnit"])
            : ["compoundWritingUnit", "lexicalUnit"].includes(
                    layer?.semanticRole,
                )
              ? new Set(["atomicWritingUnit"])
              : null;
    const semanticMatches = (layer?.relationships ?? []).filter(
        (relationship) =>
            targetRoles?.has(
                schema.layers.find(({ id }) => id === relationship.targetLayer)
                    ?.semanticRole,
            ),
    );
    if (semanticMatches.length > 0) return semanticMatches;
    return (layer?.relationships ?? []).filter(({ id }) =>
        configuredIds.has(id),
    );
}

function relationshipEditor(
    relationship,
    entry,
    entries,
    schema,
    language,
    {
        carousel = false,
        hiddenOnly = false,
        addLabel = "Add",
        allowAdd = true,
        ordersPronunciation = false,
    } = {},
) {
    const targetLayer = schema.layers.find(
        ({ id }) => id === relationship.targetLayer,
    );
    const label =
        localizedLabel(targetLayer?.metadata, language) ||
        relationship.targetLayer;
    const pronunciationText = [entry.fields?.pronunciation]
        .flat()
        .filter((value) => typeof value === "string")
        .join("");
    const authoredText = pronunciationText || entry.label;
    const selectedValues = (entry.references ?? [])
        .filter(({ relation }) => relation === relationship.id)
        .sort((left, right) => {
            if (ordersPronunciation) {
                const pronunciationIndex = (reference) => {
                    const candidate = entries.find(
                        ({ id }) => id === reference.entryId,
                    );
                    const values = [candidate?.fields?.pronunciation]
                        .flat()
                        .filter((value) => typeof value === "string");
                    const indexes = [...values, candidate?.label]
                        .filter(Boolean)
                        .map((value) => authoredText.indexOf(value))
                        .filter((index) => index >= 0);
                    return indexes.length
                        ? Math.min(...indexes)
                        : Number.MAX_SAFE_INTEGER;
                };
                const indexDifference =
                    pronunciationIndex(left) - pronunciationIndex(right);
                if (indexDifference) return indexDifference;
            }
            return (
                (left.position ?? Number.MAX_SAFE_INTEGER) -
                (right.position ?? Number.MAX_SAFE_INTEGER)
            );
        })
        .map(({ entryId }) => entryId);
    const selected = new Set(selectedValues);
    const availableTargets = entries.filter(
        (candidate) =>
            candidate.schemaId === entry.schemaId &&
            candidate.layer === relationship.targetLayer &&
            candidate.id !== entry.id,
    );
    const previewFor = (target) => {
        const definition = (target.references ?? [])
            .map(({ entryId }) => entries.find(({ id }) => id === entryId))
            .find((candidate) => {
                const targetLayer = candidate
                    ? layerForEntry([schema], candidate)
                    : null;
                return ["definition", "meaning"].includes(
                    targetLayer?.semanticRole,
                );
            });
        return definition
            ? definitionText(
                  definition,
                  layerForEntry([schema], definition),
                  document.documentElement.lang,
              )
            : "";
    };
    const targets = carousel
        ? [...availableTargets]
              .sort(
                  (left, right) =>
                      Number(Boolean(previewFor(right))) -
                      Number(Boolean(previewFor(left))),
              )
              .filter(
                  (target, index, all) =>
                      all.findIndex(
                          (candidate) =>
                              candidate.label.normalize("NFKC") ===
                              target.label.normalize("NFKC"),
                      ) === index,
              )
        : availableTargets;
    const select = `<select name="relationship:${escapeHtml(relationship.id)}" multiple${carousel ? " hidden" : ` size="${Math.min(6, Math.max(2, targets.length))}"`}>${availableTargets.map((target) => `<option value="${escapeHtml(target.id)}"${selected.has(target.id) ? " selected" : ""}>${escapeHtml(target.label)}</option>`).join("")}</select>`;
    if (hiddenOnly) return select.replace(" multiple", " multiple hidden");
    if (!carousel)
        return `<label><span>${escapeHtml(label)}</span>${select}</label>`;
    return `<div class="library-composer-relationship" data-library-composer-relationship="${escapeHtml(relationship.id)}" data-target-layer="${escapeHtml(relationship.targetLayer)}">${select}${renderHorizontalCarousel({ id: relationship.id, label, items: targets.map((target) => ({ value: target.id, label: ordersPronunciation ? [target.fields?.pronunciation].flat().filter(Boolean).join(" · ") || target.label : target.label, preview: previewFor(target) })), selectedValues, addLabel, allowAdd })}</div>`;
}

export function editorBody(
    entry,
    schemas,
    entries,
    i18n,
    extraHtml = "",
    options = {},
) {
    const schema = schemas.find(({ id }) => id === entry.schemaId);
    const layer = schema?.layers.find(({ id }) => id === entry.layer);
    const immutableStringKeyField =
        layer?.semanticRole === "definition"
            ? layer.definitionLocalization?.stringKeyField
            : undefined;
    const pronunciationField = layer?.fields?.find(
        ({ id }) => id === "pronunciation",
    );
    const pronunciationRelationshipIds = new Set(
        pronunciationField?.input?.linkRelationships ?? [],
    );
    const pronunciationRelationships = pronunciationRelationshipsFor(
        layer,
        schema,
        pronunciationRelationshipIds,
    );
    pronunciationRelationships.forEach(({ id }) =>
        pronunciationRelationshipIds.add(id),
    );
    const inlinePronunciationCarousel =
        options.inlinePronunciationCarousel &&
        pronunciationRelationships.length > 0
            ? pronunciationRelationships
                  .map((relationship) =>
                      relationshipEditor(
                          relationship,
                          entry,
                          entries,
                          schema,
                          schema.language,
                          {
                              carousel: true,
                              allowAdd: false,
                              ordersPronunciation: true,
                          },
                      ),
                  )
                  .join("")
            : "";
    const fields = (layer?.fields ?? [])
        .filter((field) => field.id !== immutableStringKeyField)
        .map((field) => {
            if (
                field.id === "pronunciation" &&
                options.inlinePronunciationCarousel &&
                pronunciationRelationships.length > 0
            ) {
                const value = entry.fields?.[field.id];
                const fieldLabel = localizedLabel(
                    field.metadata,
                    schema.language,
                );
                const pronunciations = Array.isArray(value)
                    ? value
                    : value
                      ? [value]
                      : [];
                return `<fieldset class="library-pronunciation-selector"><legend>${escapeHtml(fieldLabel)}</legend><div class="library-pronunciation-values" data-library-pronunciation-values>${pronunciations.map((pronunciation) => `<span data-value="${escapeHtml(pronunciation)}">${escapeHtml(pronunciation)}</span>`).join("")}</div><input name="field:pronunciation" type="hidden" value="${escapeHtml(pronunciations.join("\u001f"))}">${inlinePronunciationCarousel}<div class="library-pronunciation-commit"><output data-library-pronunciation-current></output><button class="btn-confirm" type="button" data-library-pronunciation-commit>${escapeHtml(i18n.t("gateway.study.library_commit_pronunciation"))}</button></div></fieldset>`;
            }
            return inputForField(
                field,
                entry.fields?.[field.id],
                schema.language,
                i18n,
            );
        })
        .join("");
    const relationships = (layer?.relationships ?? [])
        .map((relationship, relationshipIndex, allRelationships) => {
            const targetRole = schema?.layers.find(
                ({ id }) => id === relationship.targetLayer,
            )?.semanticRole;
            const duplicateTarget = allRelationships
                .slice(0, relationshipIndex)
                .some(
                    (candidate) =>
                        candidate.targetLayer === relationship.targetLayer,
                );
            const carouselEligible =
                options.relationshipCarousels === true &&
                !duplicateTarget &&
                !["definition", "meaning"].includes(targetRole) &&
                (layer?.semanticRole !== "compoundWritingUnit" ||
                    targetRole === "atomicWritingUnit");
            return relationshipEditor(
                relationship,
                entry,
                entries,
                schema,
                schema.language,
                {
                    carousel: carouselEligible,
                    hiddenOnly:
                        options.relationshipCarousels === true &&
                        !carouselEligible,
                    addLabel: i18n.t("gateway.study.library_create"),
                    previousLabel: i18n.t("ui.reuse.previous"),
                    nextLabel: i18n.t("ui.reuse.next"),
                    allowAdd: options.relationshipCarouselAdd !== false,
                },
            );
        })
        .join("");
    const referencedEntries = (entry.references ?? [])
        .map(({ entryId }) => entries.find(({ id }) => id === entryId))
        .filter(Boolean);
    const definitionEntries = referencedEntries.filter((candidate) => {
        const candidateLayer = schema?.layers.find(
            ({ id }) => id === candidate.layer,
        );
        return candidateLayer?.semanticRole === "definition";
    });
    const definitionSummaryFields = (definition) => {
        const definitionLayer = layerForEntry([schema], definition);
        const translationsField =
            definitionLayer?.definitionLocalization?.translationsField;
        const translations = definition.fields?.[translationsField];
        if (!translations || typeof translations !== "object") return "";
        return Object.entries(translations)
            .filter(([, value]) => typeof value === "string" && value.trim())
            .map(
                ([languageCode, value]) =>
                    `<div class="library-definition-translation"><dt lang="${escapeHtml(languageCode)}">${escapeHtml(languageCode.toLocaleUpperCase())}</dt><dd lang="${escapeHtml(languageCode)}">${escapeHtml(value)}</dd></div>`,
            )
            .join("");
    };
    const definitionSummary = definitionEntries.length
        ? definitionEntries
              .map(
                  (definition) =>
                      `<article class="library-editor-aggregate library-definition-summary"><header><strong>${escapeHtml(definitionText(definition, layerForEntry([schema], definition), schema.language) || definition.label)}</strong>${entryEditMode(definition) ? `<button class="btn-neutral" type="button" data-library-edit-related="${escapeHtml(definition.id)}">${escapeHtml(i18n.t("ui.reuse.edit"))}</button>` : ""}</header><dl>${definitionSummaryFields(definition)}</dl></article>`,
              )
              .join("")
        : `<p data-library-definition-empty>${escapeHtml(i18n.t("gateway.study.library_editor_no_definitions"))}</p>`;
    const relationshipMap = `<div class="library-relationship-map"><section><h3>${escapeHtml(i18n.t("gateway.study.library_relation_parents"))}</h3><div data-library-relationship-parents>${referencedEntries.map((candidate) => `<span>${escapeHtml(candidate.label)}</span>`).join("") || `<p>${escapeHtml(i18n.t("gateway.study.library_editor_no_relationships"))}</p>`}</div></section><strong aria-hidden="true">← ${escapeHtml(entry.label || i18n.t("gateway.study.library_create"))} →</strong><section><h3>${escapeHtml(i18n.t("gateway.study.library_relation_children"))}</h3><div>${
        entries
            .filter((candidate) =>
                (candidate.references ?? []).some(
                    ({ entryId }) => entryId === entry.id,
                ),
            )
            .map((candidate) => `<span>${escapeHtml(candidate.label)}</span>`)
            .join("") ||
        `<p>${escapeHtml(i18n.t("gateway.study.library_editor_no_relationships"))}</p>`
    }</div></section></div>`;
    const definitionsPanel = `${definitionSummary}${options.allowDefinitionCreate ? `<button class="btn-neutral library-definition-add" type="button" data-library-add-definition aria-label="${escapeHtml(i18n.t("gateway.study.library_add_definition"))}">+</button>` : ""}`;
    const contentClass =
        entry.class ??
        (layer?.semanticRole === "definition"
            ? "definition"
            : layer?.semanticRole === "orderedLexicalSequence"
              ? "composite"
              : "");
    const label = options.generatedLabel
        ? `<input name="label" type="hidden" required maxlength="500" value="${escapeHtml(entry.label)}">`
        : `<label><span>${escapeHtml(options.labelText ?? i18n.t("gateway.study.library_admin_label"))} *</span><input name="label" required maxlength="500" value="${escapeHtml(entry.label)}"></label>`;
    const classOptions =
        layer?.semanticRole === "orderedLexicalSequence"
            ? ["composite", "sentence"]
            : layer?.semanticRole === "lexicalUnit"
              ? ["word", "particle"]
              : [];
    const classField = classOptions.length
        ? `<label><span>${escapeHtml(i18n.t("gateway.study.library_content_class"))}</span><select name="class">${classOptions.map((value) => `<option value="${value}"${value === contentClass ? " selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label>`
        : `<input name="class" type="hidden" value="${escapeHtml(contentClass)}">`;
    const isDefinition = layer?.semanticRole === "definition";
    const tags = Array.isArray(entry.tags) ? entry.tags : [];
    const tagsField = `<div class="library-tag-field" data-library-tag-field><span>${escapeHtml(i18n.t("gateway.study.library_tags"))}</span><div class="library-tag-list">${tags.map((tag) => `<button type="button" class="btn-neutral" data-library-tag="${escapeHtml(tag)}">${escapeHtml(tag)} ×</button>`).join("")}</div><input data-library-tag-input aria-label="${escapeHtml(i18n.t("gateway.study.library_tags"))}"><input name="tags" type="hidden" value="${escapeHtml(tags.join("\u001f"))}"></div>`;
    const relationshipTab = options.showRelationshipTab
        ? `<button class="btn-neutral" type="button" role="tab" aria-selected="false" data-library-editor-tab="relationships">${escapeHtml(i18n.t("gateway.study.library_editor_relationships"))}</button>`
        : "";
    const relationshipPanel = options.showRelationshipTab
        ? `<section class="library-editor-panel" data-library-editor-panel="relationships" hidden>${relationshipMap}</section>`
        : "";
    const preservedRelationships =
        !options.persistentExtra && !options.showRelationshipTab
            ? (layer?.relationships ?? [])
                  .filter(
                      (relationship) =>
                          !options.inlinePronunciationCarousel ||
                          !pronunciationRelationshipIds.has(relationship.id),
                  )
                  .map((relationship) =>
                      relationshipEditor(
                          relationship,
                          entry,
                          entries,
                          schema,
                          schema.language,
                          { hiddenOnly: true },
                      ),
                  )
                  .join("")
            : "";
    const builder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "library-admin-editor",
            formClassName: "library-admin-editor",
            formAttributes: { "data-library-admin-editor": true },
            includeSubmitButton: false,
            submitLabelKey: "ui.reuse.save",
            fields: [],
            trustedContentHtml: `${options.persistentExtra ? `${extraHtml}${relationships}` : preservedRelationships}<nav class="library-editor-tabs" role="tablist" data-library-editor-tabs><button class="btn-neutral active" type="button" role="tab" aria-selected="true" data-library-editor-tab="content">${escapeHtml(i18n.t("gateway.study.library_editor_content"))}</button>${relationshipTab}<button class="btn-neutral" type="button" role="tab" aria-selected="false" data-library-editor-tab="definitions">${escapeHtml(i18n.t("gateway.study.library_definitions"))}</button></nav><section class="library-editor-panel" data-library-editor-panel="content">${label}${classField}${tagsField}${options.persistentExtra ? "" : extraHtml}${fields}${isDefinition || options.includeAlwaysShowDefinition === false ? '<input name="alwaysShowDefinition" type="hidden" value="">' : `<label class="library-admin-hidden"><input name="alwaysShowDefinition" type="checkbox" class="choice-checkbox"${entry.alwaysShowDefinition ? " checked" : ""}> <span>${escapeHtml(i18n.t("gateway.study.library_always_show_definition"))}</span></label>`}${isDefinition ? '<input name="hidden" type="hidden" value="true">' : options.includeHidden === false ? '<input name="hidden" type="hidden" value="">' : `<label class="library-admin-hidden"><input name="hidden" type="checkbox" class="choice-checkbox"${entry.hidden ? " checked" : ""}> <span>${escapeHtml(i18n.t("gateway.study.library_admin_hidden"))}</span></label>`}</section>${relationshipPanel}<section class="library-editor-panel" data-library-editor-panel="definitions" hidden>${definitionsPanel}</section>`,
        },
    );
    return { html: builder.render(), builder };
}

export function readFields(form, layer, entry) {
    const immutableStringKeyField =
        layer?.semanticRole === "definition"
            ? layer.definitionLocalization?.stringKeyField
            : undefined;
    return {
        ...(entry.fields ?? {}),
        ...Object.fromEntries(
            (layer?.fields ?? [])
                .filter((field) => field.id !== immutableStringKeyField)
                .map((field) => {
                    if (field.input?.immutable === true)
                        return [field.id, entry.fields?.[field.id]];
                    const name = `field:${field.id}`;
                    const valueKind = field.validation?.kind ?? field.type;
                    if (valueKind === "boolean")
                        return [
                            field.id,
                            form.elements[name]?.checked === true,
                        ];
                    if (valueKind === "localizedText") {
                        const translations = {};
                        for (const control of form.elements) {
                            if (control.name?.startsWith(`${name}:`))
                                translations[
                                    control.name.slice(name.length + 1)
                                ] = control.value;
                        }
                        return [field.id, translations];
                    }
                    const value = form.elements[name]?.value ?? "";
                    if (field.type === "strokePattern")
                        return [
                            field.id,
                            form.elements[name]?.libraryFieldValue ??
                                entry.fields?.[field.id],
                        ];
                    if (
                        field.type === "stringList" ||
                        field.validation?.kind === "list" ||
                        field.input?.control === "multiSelect"
                    )
                        return [
                            field.id,
                            field.input?.control === "multiSelect"
                                ? Array.from(
                                      form.elements[name]?.selectedOptions ??
                                          [],
                                      (option) => option.value,
                                  )
                                : value.split("\u001f").filter(Boolean),
                        ];
                    if (
                        ["number", "integer"].includes(field.type) ||
                        field.validation?.kind === "number" ||
                        field.input?.control === "number"
                    )
                        return [
                            field.id,
                            value === "" ? undefined : Number(value),
                        ];
                    return [field.id, value];
                }),
        ),
    };
}

export function readReferences(form, layer) {
    return (layer?.relationships ?? []).flatMap((relationship) =>
        Array.from(
            form.elements[`relationship:${relationship.id}`]?.selectedOptions ??
                [],
            (option, position) => ({
                entryId: option.value,
                relation: relationship.id,
                ...(relationship.ordered ? { position } : {}),
            }),
        ),
    );
}

export async function openLibraryEntryEditor({
    entry,
    entries,
    schemas,
    i18n,
    requestUpdate = false,
    onSaved = () => {},
}) {
    const schema = schemas.find(({ id }) => id === entry.schemaId);
    const layer = schema?.layers.find(({ id }) => id === entry.layer);
    const editor = editorBody(entry, schemas, entries, i18n, "", {
        includeHidden: false,
        relationshipCarouselAdd: false,
        inlinePronunciationCarousel: true,
    });
    let formController;
    return openPopup({
        title: i18n
            .t("gateway.study.library_admin_edit_title")
            .replace("{{ entry }}", entry.label),
        body: editor.html,
        maxWidth: "min(72rem, 96vw)",
        closeProtection: true,
        actions: [
            { id: "save", label: i18n.t("ui.reuse.save"), variant: "confirm" },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onOpen(overlay) {
            const form = overlay.querySelector("[data-library-admin-editor]");
            formController = editor.builder.attach(form);
            bindLibraryEditorControls(form, entry, i18n);
            mountEditableRelationshipCarousels(
                form,
                overlay,
                entries,
                schema,
                layer,
            );
            form.addEventListener("click", (event) => {
                const button = event.target.closest(
                    "[data-library-edit-related]",
                );
                if (!button) return;
                const related = entries.find(
                    ({ id }) => id === button.dataset.libraryEditRelated,
                );
                const mode = related ? entryEditMode(related) : null;
                if (!related || !mode) return;
                void openLibraryEntryEditor({
                    entry: related,
                    entries,
                    schemas,
                    i18n,
                    requestUpdate: mode === "request",
                    onSaved: (updated) => {
                        if (mode === "direct") Object.assign(related, updated);
                    },
                });
            });
        },
        onAction: async (action, overlay) => {
            if (action !== "save") return true;
            const form = overlay.querySelector("[data-library-admin-editor]");
            if (
                form.querySelector('[data-uploading="true"]') ||
                !formController?.validateAll(true) ||
                !form.checkValidity()
            ) {
                form.reportValidity();
                return false;
            }
            const proposedEntry = {
                schemaId: entry.schemaId,
                schemaVersion: entry.schemaVersion,
                layer: entry.layer,
                label: form.elements.label.value,
                class: form.elements.class.value || undefined,
                tags: form.elements.tags.value.split("\u001f").filter(Boolean),
                hidden: entry.hidden,
                alwaysShowDefinition:
                    form.elements.alwaysShowDefinition.checked,
                fields: readFields(form, layer, entry),
                references: readReferences(form, layer),
            };
            const updated = requestUpdate
                ? await requestLibraryUpdate(entry.id, proposedEntry)
                : await updateLibraryEntry(entry.id, proposedEntry);
            if (!requestUpdate) Object.assign(entry, updated);
            onSaved(updated);
            showToast(
                i18n.t(
                    requestUpdate
                        ? "gateway.study.library_update_requested"
                        : "gateway.study.library_update_success",
                ),
                { variant: "success" },
            );
            return true;
        },
    });
}

export function bindAdminLibraryInteractions(
    root,
    { entries, i18n, render, schemas, signal },
) {
    let editorOpen = false;
    root.addEventListener(
        "keydown",
        (event) => {
            if (!event.target.matches(".library-admin-entry-row")) return;
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.target.click();
        },
        { signal },
    );
    root.addEventListener(
        "click",
        async (event) => {
            const button = event.target.closest("[data-library-admin-edit]");
            const row = event.target.closest(".library-admin-entry-row");
            if (
                (!button && !row) ||
                event.target.matches("[data-library-select-entry]") ||
                editorOpen
            )
                return;
            const readOnly = !button;
            const entry = entries.find(
                ({ id }) =>
                    id ===
                    (button?.dataset.libraryAdminEdit ??
                        row?.dataset.libraryEntry),
            );
            if (!entry) return;
            const schema = schemas.find(({ id }) => id === entry.schemaId);
            const layer = schema?.layers.find(({ id }) => id === entry.layer);
            const editor = editorBody(entry, schemas, entries, i18n, "", {
                showRelationshipTab: readOnly,
                relationshipCarouselAdd: false,
                inlinePronunciationCarousel: !readOnly,
            });
            let formController;
            editorOpen = true;
            await openPopup({
                title: i18n
                    .t(
                        readOnly
                            ? "gateway.study.library_admin_view_title"
                            : "gateway.study.library_admin_edit_title",
                    )
                    .replace("{{ entry }}", entry.label),
                body: editor.html,
                maxWidth: "min(72rem, 96vw)",
                closeProtection: !readOnly,
                actions: readOnly
                    ? [
                          {
                              id: "close",
                              label: i18n.t("ui.reuse.close"),
                              variant: "neutral",
                          },
                      ]
                    : [
                          {
                              id: "save",
                              label: i18n.t("ui.reuse.save"),
                              variant: "confirm",
                          },
                          {
                              id: "cancel",
                              label: i18n.t("ui.reuse.cancel"),
                              variant: "cancel",
                          },
                      ],
                onOpen: (overlay) => {
                    const form = overlay.querySelector(
                        "[data-library-admin-editor]",
                    );
                    if (readOnly) {
                        form.querySelectorAll(
                            "input, select, textarea",
                        ).forEach((control) => {
                            control.disabled = true;
                        });
                        form.classList.add("library-admin-editor--read-only");
                    }
                    if (!readOnly) formController = editor.builder.attach(form);
                    bindLibraryEditorControls(form, entry, i18n);
                    if (!readOnly)
                        mountEditableRelationshipCarousels(
                            form,
                            overlay,
                            entries,
                            schema,
                            layer,
                        );
                },
                onAction: async (action, overlay) => {
                    if (readOnly) return true;
                    if (action !== "save") return true;
                    const form = overlay.querySelector(
                        "[data-library-admin-editor]",
                    );
                    if (
                        form.querySelector('[data-uploading="true"]') ||
                        !formController?.validateAll(true) ||
                        !form.checkValidity()
                    ) {
                        showToast(
                            i18n.t("gateway.study.library_validation_error"),
                            { variant: "error" },
                        );
                        form.reportValidity();
                        return false;
                    }
                    try {
                        const updated = await updateLibraryEntry(entry.id, {
                            schemaId: entry.schemaId,
                            schemaVersion: entry.schemaVersion,
                            layer: entry.layer,
                            label: form.elements.label.value,
                            class: form.elements.class.value || undefined,
                            tags: form.elements.tags.value
                                .split("\u001f")
                                .filter(Boolean),
                            hidden:
                                form.elements.hidden.value === "true" ||
                                form.elements.hidden.checked,
                            alwaysShowDefinition:
                                form.elements.alwaysShowDefinition.checked,
                            fields: readFields(form, layer, entry),
                            references: readReferences(form, layer),
                        });
                        Object.assign(entry, updated);
                        render();
                        showToast(
                            i18n.t("gateway.study.library_update_success"),
                            { variant: "success" },
                        );
                        return true;
                    } catch {
                        showToast(
                            i18n.t("gateway.study.library_update_error"),
                            { variant: "error" },
                        );
                        return false;
                    }
                },
            }).finally(() => {
                editorOpen = false;
            });
        },
        { signal },
    );
}
