# Action Menu Ownership

**Feature Branch:** feature-hamburger-lifetime641

## Keep Menus With Their Page

Pending and open action menus close when their page is canceled, their opening button is removed, or a newer menu replaces them. Stale controls cannot return an action. Users and Modules forward their current page lifetime without changing downstream actions.

## Navigate Actions by Keyboard

Menus enter the first enabled action and support arrow keys, Home, End, Escape and Tab. Escape returns focus to the current opening button; outside pointer dismissal preserves the new focus. Shared floating-menu and transient-surface contracts preserve tutorial reservations across bundled and directly served callers.

## Keep Popup Focus With Its Owner

Pending menus also cancel when focus leaves, so delayed preparation cannot take focus back. Menus opened inside a popup use its existing delegated focus ownership: navigation and Escape leave the parent open, moving to another popup control preserves that focus, and a new nested popup or parent closure dismisses the menu.

## Commits

- [6fdfd7da07688831003a38a6e46787e9307ea7ec](https://github.com/Cognis-Labs-HQ/Cognis/commit/6fdfd7da07688831003a38a6e46787e9307ea7ec)
- [7e278f92e13030097bf626ac18c527626c6ae129](https://github.com/Cognis-Labs-HQ/Cognis/commit/7e278f92e13030097bf626ac18c527626c6ae129)
