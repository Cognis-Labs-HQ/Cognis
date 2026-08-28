# Faster Language Switching

**Feature Branch:** feature-add-language-switcher-with-settings-options

## Language switcher in the dashboard

Cycle through preferred languages from the floating flag button. The final choice is promoted after five seconds and applied with a page reload.

## Language preference control

User Settings now enables the language switcher by default, offers an opt-out, and keeps both language lists together in one side-by-side block.

The switch remains synchronized when the Languages page is mounted again, and changing it reliably activates the settings save and discard controls.

Turning the preference off marks Settings as changed and hides the floating control only after Save confirms the change. Reloading no longer leaves an empty button behind.

## Page buttons update during navigation

Pages now retain ownership of their own Page Composer edit control, so navigating from a non-editable page to an editable page immediately shows every available action without requiring a refresh.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/741230d55d134bfb52a89d52831bedfdcc1c13f1
