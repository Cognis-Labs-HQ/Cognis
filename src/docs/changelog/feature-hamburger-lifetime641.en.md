# Action Menu Ownership

**Feature Branch:** feature-hamburger-lifetime641

## Keep Menus With Their Page

Pending and open action menus close when their page is canceled, their opening button is removed, or a newer menu replaces them. Stale controls cannot return an action. Users and Modules forward their current page lifetime without changing downstream actions.

## Navigate Actions by Keyboard

Menus enter the first enabled action and support arrow keys, Home, End, Escape and Tab. Escape returns focus to the current opening button; outside pointer dismissal preserves the new focus. Shared floating-menu and transient-surface contracts preserve tutorial reservations across bundled and directly served callers.

## Keep Popup Focus With Its Owner

Pending menus also cancel when focus leaves, so delayed preparation cannot take focus back. Menus opened inside a popup use its existing delegated focus ownership: navigation and Escape leave the parent open, moving to another popup control preserves that focus, and a new nested popup or parent closure dismisses the menu.

## Commits

- [Bind action menus to page lifetime and keyboard focus](https://github.com/Cognis-Labs-HQ/Cognis/commit/f06b861265f7eec19d4638b3c116dc8494f1d03a)
- [Preserve pending and popup action menu focus ownership](https://github.com/Cognis-Labs-HQ/Cognis/commit/2c26ef2ce4aec3df5306d4e7ff8f45db419286c6)
- [Group hamburger containment test with menu coverage](https://github.com/Cognis-Labs-HQ/Cognis/commit/afc479630e96877af589cd5f940dbc9b5ffbc261)
