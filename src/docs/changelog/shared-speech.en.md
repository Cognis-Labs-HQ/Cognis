# Shared Speech Integration

**Feature Branch:** feature-update-external-package-contract-definitions

## Usage

Move ElevenLabs synthesis into its own configurable module. Study uses optional per-language voices for saved global cards, while private and classroom cards accept bounded uploads and microphone recordings. Preserve continuous sentence composition as a fallback using existing constituent recordings. Administrators can regenerate global audio while editing.

## Fix Study enablement

Advance the actual English and Japanese content-pack versions when removing bundled recordings. Complete unrelated module reconciliation before reporting a failed activation so consent routes retain their registered flows.

## Publish speech without privilege

Publish `elevenlabs-tts:synthesis` within the module-owned namespace and remove the privileged flag. English and Japanese Study resolve this capability through ctx using their existing optional module dependency. The Study bridge receives the live capability getter from its caller, preserving provider disable/re-enable and configured voice handling.

## Commits

- [2bebe47](https://github.com/Cognis-Labs-HQ/Cognis/commit/2bebe47baf20112a4c84cff2bb65ce270c6b52eb)
- [7c495dc](https://github.com/Cognis-Labs-HQ/Cognis/commit/7c495dcda4c67bdff3c385670465baee4763b046)
