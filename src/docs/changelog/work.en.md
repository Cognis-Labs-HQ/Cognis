# Stable Child Card Navigation

**Feature Branch:** work

## Stable Child Positions

Child cards preserve their fitted positions while deeper branches open. New descendants are placed by depth into visible free slots with collision clearance, preventing cards and connectors from jumping or overlapping.

## Reliable Pointer Navigation

Diagonal routes now have a larger continuous hit corridor, branch changes use a short hover-intent delay, and active cards no longer pulse. Direction fallback ordering also keeps initial child layouts compact around their preferred axis.

## Unified Composition Carousels

Input and pronunciation now use the same reusable token input and carousel rendering. Input carousels sit directly under their field, selected tokens share the compact contained remove button, and dependency creation controls appear only for layers that users can normally create.

## Immediate Dependency Composition

Cards created from a carousel’s add control now return through the same selection path as existing cards, so they are immediately added to the active stage. Alternate-character pronunciation fields now include their atomic-character carousel even when the provider relationship uses a broader presentation role.

## Stroke Lookup and Guided Validation

Stroke-capable composers now place field-aware lookup actions under a dedicated Stroke Pattern heading and draw loaded data in a compact preview. Required relationship validation now marks affected tabs, opens the tab containing the earliest invalid field, and focuses the field or definition action that needs attention.

## Aligned Popup Title Details

Popup definitions no longer carry a leading em dash. Pronunciation and definition groups now share the primary title row and are vertically centered against the card title.

## Accurate Composer Requirements

Definition requirements now mark the Definitions tab and add action, while invalid pronunciation fields identify themselves directly. Tabs retain their normal color and show only a red asterisk. Alternate characters may omit definitions and now load all non-definition pronunciation relationships. Stroke and dictionary lookup providers declare neutral capabilities for correct placement and per-layer dictionary opt-out. Tags now appear last in Content forms.

## Reusable Tabbed Form Validation

Library multi-tab validation now uses the shared form composer’s tab-validation controller instead of maintaining an adapter-specific implementation. The reusable controller owns tab activation, invalid markers, and earliest-invalid-field focus; Library supplies only its definition-specific focus target and styling class.

## Correct Alt-Character Composer Routing

Alternate-character composers now keep provider-declared character pronunciation carousels and fall back only to atomic character relationships, preventing vocabulary cards from appearing under Pronunciation. Stroke-pattern providers are classified by their neutral contract metadata or localized field label, so their action is removed from the general lookup row and rendered as “Lookup” inside Stroke Pattern.

## Constrain Alternate-Character Pronunciation

Alternate-character pronunciation carousels now resolve exclusively from relationships targeting atomic writing units. Constructor carousel lists remain form-payload references and can no longer cause a vocabulary carousel to appear in an alternate-character pronunciation editor.

## Restore Library Views and Character Carousels

Provider-declared Verbs and Adverbs views now resolve through the Library layer SPA route instead of returning 404. Alternate-character composers now populate pronunciation from schema-wide atomic character layers and omit unrelated vocabulary relationships while retaining definitions.

## Align Alternate-Character Payloads

Alternate-character form payloads now copy their pronunciation carousel list directly from the vocabulary form payload in the same schema. The previous alternate-character-specific carousel inference and filtering code has been removed.

## Replace the Vocabulary Carousel

Alternate-character form alignment now replaces both the Vocabulary pronunciation target and its rendering relationship with the character relationship used by Vocabulary cards. Kanji pronunciation creation therefore shows the character carousel instead of Vocabulary.

## Correct Pronunciation and Duplicates

Explicit word and sentence pronunciations now stop recursive character derivation. Visible duplicate inputs are blocked and continuing selects the existing card, while request persistence recognizes update and merge kinds.

## Keep Definitions Beneath Titles

Popup definitions now begin beneath the card title and wrap across the available title area instead of being forced into the right-hand edge.

## Preserve Particle Pronunciation

Particle pronunciation now terminates resolution at the particle itself, preventing character references from replacing context-sensitive authored readings.

## Edit Saved Pronunciations

Empty pronunciation stages now produce an error toast. Saved pronunciation cards contain their remove control, and selecting one restores its component cards to the stage and carousels for editing.

## Complete Definition Editing

The preview-definition checkbox now lives in Definitions, and existing-card editors can create and immediately select additional definitions.

## Stable Parent Definitions

Parent attribution now stays grouped in the reading row before the definition. Cards that inherit a parent definition therefore preserve the definition beneath the title without splitting the localized parent label across the popup heading.

## Restore Tagged Views

Content-pack tags now survive validation and ingestion into Library entry records. Provider-declared Verbs and Adverbs views can therefore match and render their tagged vocabulary instead of reporting an empty layer.

## Composable Transformation Trees

Verb and adverb transformations now support extended branching chains, transformation-specific readings and definitions, and a connected technology-tree layout. Sentence composers can select transformed carousel forms while preserving canonical references, and transformed references reopen with their authored form and complete pathway.

## Parent-Safe Child Cards

Child-card placement now excludes every ancestor slot and searches diagonal and cardinal positions at progressively greater distances. Blocked children move outward by additional slots instead of covering an ancestor or being withheld.

## Interactive full-width transformation trees

Transform-tree views now begin as a dense, full-width card grid. Cards without available transformations remain inert. Opening an expandable card moves it to the top, animates the remaining cards away, and grows the tree directly beneath the centered root across the full content width; its close control restores the grid. Selecting a transformation highlights and continuously animates its complete route back to the root, while transformation labels stack above values to avoid narrow-card overflow.

## Continuous transformation paths and stable roots

Transformation trees now keep the source verb or adverb card as the unchanged visual root and omit the redundant selected-form summary beneath it. Connector segments meet without gaps and animate continuously throughout the tree, while the selected ancestry remains visibly emphasized. Clicking the already-open source card now opens its standard detail view.

## Vocabulary-integrated transformation selection

Verb and adverb entries now remain on the Vocabulary page, where provider-declared transformation tags appear as filters instead of separate navigation destinations. A transform rule may declare localized `marker` metadata, and Cognis inserts it into a referenced definition’s `{{ marker }}` slot (for example, `to {{ marker }} watch` becomes `to (want to) watch`). Form names moved into per-node information tooltips. The standard detail popup exposes a Variants action that opens a dedicated graph selector; selecting a node redraws the base entry with transformed title, pronunciation, definition, and drawing input while suppressing editing. Composer carousels identify transformable entries and use a two-column chooser that can select one transform or retain the base form.

## Balanced transformation graphs and reliable markers

Transformation graphs now size each branch from its complete descendant subtree, preserve a twelve-rem minimum node width, distribute branches across intrinsic graph width, and scroll horizontally when the graph exceeds the dialog. This prevents deep or highly branched conjugation families from crushing cards into narrow columns. Definition-marker resolution now accepts localized metadata or a direct string, matches both `{{ marker }}` and `{{marker}}`, resolves against the active interface locale, replaces every marker in multi-definition text, and gives an authored marker template precedence over a legacy full-definition override.

## Transformation Graph and Definition Fidelity

Transformation trees now use curved SVG graph edges, keep scrolling inside the graph, and leave popup actions visible. Selecting a variant now persists into the returned detail view, updates every referenced definition with the provider marker, and places the Variants control on the left.

## Correct Homograph Links

Fallback title composition now follows semantic layer order. Vocabulary entries with identical written forms link to their atomic or compound writing units instead of linking to one another, while sentence composition continues to resolve vocabulary entries.

## Compact Transformation Graphs

Transformation graphs now use one horizontal row per depth, place spacious definitions below each card, and keep both axes of overflow inside a viewport-height graph region so popup actions remain visible. Selected transforms replace composed base-title links, ensuring the transformed title appears in detail views. Provider rules now use composable localized definition templates with explicit prefix and suffix matching instead of fixed markers.

## Contextual Definition Chains

Transformation trees now render the untransformed entry as the centered root card and start links below each node’s definition area. Definition transforms support ordered localized substitutions before fallback templates, enabling later rules to rewrite prior meanings—such as “want to” into “have wanted to”—or append sequencing after the complete transformed definition.

## Return from Transformed Cards

A transformed card now replaces its Variants control with a localized “Return to {card}” action. Returning restores the canonical card within the same detail-navigation context, including its title, pronunciation, definitions, drawing target, edit capability, and Variants control.

## Undistorted Drawing Resize

The Drawing Practice canvas now fits its logical stroke coordinate space into a centered, aspect-preserving viewport derived from the actual rendered canvas size. Resizing can add horizontal or vertical breathing room but no longer stretches characters, guides, annotations, accepted strokes, or live pointer input.

## Reliable Vocabulary Composition

Vocabulary create and edit forms now expose a character carousel even when a provider only declares a pronunciation relationship. Saved pronunciation groups visibly move out of the staging row, provider tags no longer gain a redundant layer class, and failed creates show an error while preserving the open form.

## Actionable Pronunciation Saving

Saving a pronunciation now commits its staged character group before updating the field, safely clears carousel controls that do not render order badges, and confirms the save. Creation errors distinguish unsaved pronunciation groups and include the server error code for other failures while keeping the form open.

## Commits

- [0518e6c4](https://github.com/Cognis-Labs-HQ/Cognis/commit/0518e6c409501b6c12e96010ef2d039acec42bd5)
- [54c47947](https://github.com/Cognis-Labs-HQ/Cognis/commit/54c479475d86915fff94aff089b9670f887d4c7d)

- [44891fa5](https://github.com/Cognis-Labs-HQ/Cognis/commit/44891fa5705fc417cf0fbd75b96599a6fac21895)
- [3e86f4e5](https://github.com/Cognis-Labs-HQ/Cognis/commit/3e86f4e5c83828d0101fbacb4354381048de5290)

- [03268e5b](https://github.com/Cognis-Labs-HQ/Cognis/commit/03268e5bb34d94a46146b0ec6ba9f3e678752481)
- [8862690a](https://github.com/Cognis-Labs-HQ/Cognis/commit/8862690a835650a677efa6a5404ad55491b6a778)

- [ccbab39b](https://github.com/Cognis-Labs-HQ/Cognis/commit/ccbab39b)
- [db0728af](https://github.com/Cognis-Labs-HQ/Cognis/commit/db0728af)
- [9c77e48f](https://github.com/Cognis-Labs-HQ/Cognis/commit/9c77e48f)
- [41d895c6](https://github.com/Cognis-Labs-HQ/Cognis/commit/41d895c6)
- [e5f1dd4b](https://github.com/Cognis-Labs-HQ/Cognis/commit/e5f1dd4b)
- [ed27aee1](https://github.com/Cognis-Labs-HQ/Cognis/commit/ed27aee1)
- [ac06311e](https://github.com/Cognis-Labs-HQ/Cognis/commit/ac06311e)
- [517d09f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/517d09f0)
- [38faf70c](https://github.com/Cognis-Labs-HQ/Cognis/commit/38faf70c)
- [12a11fa8](https://github.com/Cognis-Labs-HQ/Cognis/commit/12a11fa8)
- [fc7e7054](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc7e7054)
- [28161864](https://github.com/Cognis-Labs-HQ/Cognis/commit/28161864)
- [0fcff931](https://github.com/Cognis-Labs-HQ/Cognis/commit/0fcff931)
- [6d0da649](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d0da649)
- [9d4adb8](https://github.com/Cognis-Labs-HQ/Cognis/commit/9d4adb8)
- [492cf08](https://github.com/Cognis-Labs-HQ/Cognis/commit/492cf08)
- [b3a66ab8](https://github.com/Cognis-Labs-HQ/Cognis/commit/b3a66ab8)
- [1bc87c38](https://github.com/Cognis-Labs-HQ/Cognis/commit/1bc87c38)
- [5c9ef37](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c9ef37)
- [0223c43](https://github.com/Cognis-Labs-HQ/Cognis/commit/0223c43)
- [0055fdfe](https://github.com/Cognis-Labs-HQ/Cognis/commit/0055fdfe)
- [8e60e383](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e60e383)
- [5f098e37](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f098e37)
- [4d32a72e](https://github.com/Cognis-Labs-HQ/Cognis/commit/4d32a72e)
- [7dea5c6c](https://github.com/Cognis-Labs-HQ/Cognis/commit/7dea5c6c)
- [e356a233](https://github.com/Cognis-Labs-HQ/Cognis/commit/e356a233)
- [6c0ba3ed](https://github.com/Cognis-Labs-HQ/Cognis/commit/6c0ba3ed)
- [a0d73d7a](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0d73d7a)
- [80471e37](https://github.com/Cognis-Labs-HQ/Cognis/commit/80471e37)
