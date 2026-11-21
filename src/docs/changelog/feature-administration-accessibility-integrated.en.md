# Named Administration Controls

**Feature Branch:** feature-administration-accessibility-integrated

## Associate Security labels

Session timeout, validation mode and approval controls use their visible translated labels. The timeout Unit selector has its own label and retains the duration heading as context. Information buttons remain separate from checkbox activation.

## Expose native switches

Administration switch inputs remain native checkboxes with checked and disabled semantics. Transparent inputs retain focusability and the visible slider has a focus outline. Existing component-row sizes, protected controls, Broadcast labels and memory-only draft and Discard behavior are preserved.

## Verify rendered controls

Public renderer tests cover all four languages, repeated renders, strict English fallback and both stylesheet orders. Existing tutorial steps and targets remain unchanged. DOM and CSS checks do not replace native keyboard, screen-reader or device verification.

## Commits

- [c377f058e0534a86bd7ff8d8b91150c8f24d6fc3](https://github.com/Cognis-Labs-HQ/Cognis/commit/c377f058e0534a86bd7ff8d8b91150c8f24d6fc3)
