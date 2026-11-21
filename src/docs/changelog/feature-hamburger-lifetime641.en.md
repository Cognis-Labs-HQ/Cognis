# Action Menu Ownership

**Feature Branch:** feature-hamburger-lifetime641

## Keep Menus With Their Page

Pending and open action menus close when their page is canceled, their opening button is removed, or a newer menu replaces them. Stale controls cannot return an action. Users and Modules forward their current page lifetime without changing downstream actions.

## Navigate Actions by Keyboard

Menus enter the first enabled action and support arrow keys, Home, End, Escape and Tab. Escape returns focus to the current opening button; outside pointer dismissal preserves the new focus. Shared floating-menu and transient-surface contracts preserve tutorial reservations across bundled and directly served callers.

## Keep Popup Focus With Its Owner

Pending menus also cancel when focus leaves, so delayed preparation cannot take focus back. Menus opened inside a popup use its existing delegated focus ownership: navigation and Escape leave the parent open, moving to another popup control preserves that focus, and a new nested popup or parent closure dismisses the menu.

## Commits

- [d437ae0479f6a2ecc6ca83926275b4779014fdf3](https://github.com/Cognis-Labs-HQ/Cognis/commit/d437ae0479f6a2ecc6ca83926275b4779014fdf3)
- [d3d62fbdd0397e2a982bf1e05cdd1b0126d45597](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3d62fbdd0397e2a982bf1e05cdd1b0126d45597)
