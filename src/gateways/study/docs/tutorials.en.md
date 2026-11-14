# Guided Tutorials

## Use A Guide

On Explore, choose Study Overview from the ? beside the page title. This manual guide explains navigation, the selected language, available dictionary search and Study settings. It stays on the current layer and omits unavailable controls. Language-owned guides explain content and remain limited to their own language.

## Technical Specification

| Page / Surface                      | Guide             | Access         |
| ----------------------------------- | ----------------- | -------------- |
| `/study/explore/*`                  | Study Overview    | Signed-in user |
| `/study/settings`, `/study/welcome` | Study Preferences | Signed-in user |

## Overview And Language Guides

The overview keeps the completion identity `study:getting-started`. Use Next, Back or Restart to review navigation without changing the page. Completed guides can be replayed from the same ? menu. Language-specific guides can start automatically on their own enrolled language’s content; changing the selected language exposes that language’s guide.

`study:tutorialTargets` publishes Study-owned navigation and drawing targets plus scoped `route` and `attachDrawing` actions. `matchesPage` matches only Explore paths for the supplied language. `isEnrolled(language)` reads verified account-bound preferences through `study:navigation`. Discovery never navigates or enrolls a language. Library owns interactive card walkthroughs and their generic fallback.

The former directory-only `modules` tutorial target is removed. External guide consumers must target the current navigation or their own content rather than that retired directory.
