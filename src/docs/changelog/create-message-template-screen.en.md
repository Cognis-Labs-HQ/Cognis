# Messages: Template Sidebar

**Feature Branch:** copilot/create-message-template-screen

## Template management moved to sidebar

Message templates are now managed directly from the sidebar instead of inside the composer toolbar. A labelled button at the top of the templates section opens a focused create/edit popup, and each saved template appears in the list below it with use, edit, and delete actions.

## Popup simplified to editor only

The template popup now shows only the editor form. Templates are no longer selected from a list inside the popup; clicking a template title in the sidebar loads it into the composer directly.

## Create and Save labels on popup submit

The popup submit button now reads "Create" when adding a new template and "Save" when editing an existing one, making the intent clear in each context.

## Sidebar chat and template lists scroll independently

The chat list and template list each have their own scroll region so a large number of conversations never pushes the templates section out of view.

## Templates scoped per account

Saved message templates are now isolated to the account that created them. On a shared device, switching accounts shows only that account's own templates instead of those from a previous session.

## Composer text preserved across layout rerenders

Unsent text typed in the message composer is no longer lost when the page recompositor rebuilds the layout grid, such as when crossing a responsive column breakpoint.

## Commits

- [3cf607d](https://github.com/Cognis-Labs-HQ/Cognis/commit/3cf607d2e31db00d07bdc6e7a247b2e1795857c2)
