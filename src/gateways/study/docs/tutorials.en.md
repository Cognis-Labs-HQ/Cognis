# Guided Tutorials

These guides explain the actions available in this component.

## Use A Guide

Visit a page below to start its unseen guide. Use the ? beside the page title to replay a completed guide; Skip leaves a replay.

## Technical Specification

| Page / surface                   | Guide             | Access         |
| -------------------------------- | ----------------- | -------------- |
| `/study`                         | Study Overview    | Signed-in user |
| `^/study/(?:settings\|welcome)$` | Study Preferences | Signed-in user |

## Overview And Language Guides

The `/study` guide covers the activity subnav, enrolled languages, available modules, dictionary search and Study settings, omitting unavailable controls. It does not repeat card workflows.

`study:tutorialTargets` publishes Study-owned navigation and drawing targets plus scoped `route` and `attachDrawing` actions. `isEnrolled(language)` reads verified preferences through `study:navigation`, bound to the current account and invalidated on enrollment changes. Visiting a language does not enroll it.

Language-module guides can be selected from the overview's ? menu. Choosing one intentionally enters that language's Explore content. They start automatically only on their own content pages and preserve the current layer when already there. Library owns the interactive card walkthrough and its generic fallback; see its component documentation.

## Adaptive Study Navigation

Language names shorten to their language code and then their flag when the available space is tight. The full language name remains the accessible label and tooltip. Languages without a flag retain their code. More space restores the full names.

Sub-navigation links and buttons share the same underline thickness for resting, active, hover and keyboard-focus states. The shared shell owns this styling, including Leaderboard; Study only owns its language-label presentation.
