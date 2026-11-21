# Action Menu Ownership

**Feature Branch:** feature-hamburger-lifetime641

## Keep Menus With Their Page

Pending and open action menus close when their page is canceled, their opening button is removed, or a newer menu replaces them. Stale controls cannot return an action. Users and Modules forward their current page lifetime without changing downstream actions.

## Navigate Actions by Keyboard

Menus enter the first enabled action and support arrow keys, Home, End, Escape and Tab. Escape returns focus to the current opening button; outside pointer dismissal preserves the new focus. Shared floating-menu and transient-surface contracts preserve tutorial reservations across bundled and directly served callers.

## Keep Popup Focus With Its Owner

Pending menus also cancel when focus leaves, so delayed preparation cannot take focus back. Menus opened inside a popup use its existing delegated focus ownership: navigation and Escape leave the parent open, moving to another popup control preserves that focus, and a new nested popup or parent closure dismisses the menu.

## Commits

- [f56c092cb8286c5420faccc7f943f24d4a20a2ab](https://github.com/Cognis-Labs-HQ/Cognis/commit/f56c092cb8286c5420faccc7f943f24d4a20a2ab)
- [f5535c3f93e2e101b4ae7fb399e1f81fabe9b1da](https://github.com/Cognis-Labs-HQ/Cognis/commit/f5535c3f93e2e101b4ae7fb399e1f81fabe9b1da)
