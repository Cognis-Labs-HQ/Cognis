# Shared Speech Integration

**Feature Branch:** feature-update-external-package-contract-definitions

## Usage

Move ElevenLabs synthesis into its own configurable module. Study uses optional per-language voices for saved global cards, while private and classroom cards accept bounded uploads and microphone recordings. Preserve continuous sentence composition as a fallback using existing constituent recordings. Administrators can regenerate global audio while editing.

## Fix Study enablement

Advance the actual English and Japanese content-pack versions when removing bundled recordings. Complete unrelated module reconciliation before reporting a failed activation so consent routes retain their registered flows.

## Publish speech without privilege

Publish `elevenlabs-tts:synthesis` within the module-owned namespace and remove the privileged flag. English and Japanese Study resolve this capability through ctx using their existing optional module dependency. The Study bridge receives the live capability getter from its caller, preserving provider disable/re-enable and configured voice handling.

## Keep speech optional

The published capability reports live `configured` readiness. Study enables automatic speech only after both the API key and default voice are saved. If ElevenLabs is absent, disabled, or unconfigured, language registration still succeeds and uploaded audio and composite fallback remain available; no synthesis is requested.

## Run disabled configuration flows

Allow isolated disabled configuration entrypoints to register and execute their owned flows. This fixes ElevenLabs configuration returning `speech_unavailable` before enablement. Reject foreign flow registrations and hooks even for privileged disabled modules, and remove partial flows after failed setup.

## Preserve routes during module refresh

Wait for active module requests before disposing their flows, and defer new module requests until reconciliation finishes, including failed activation. Consent checks retain a complete route and flow lifecycle while unrelated Study modules are enabled.

## Commits

- [2bebe47](https://github.com/Cognis-Labs-HQ/Cognis/commit/2bebe47baf20112a4c84cff2bb65ce270c6b52eb)
- [7c495dc](https://github.com/Cognis-Labs-HQ/Cognis/commit/7c495dcda4c67bdff3c385670465baee4763b046)
- [a59ae79](https://github.com/Cognis-Labs-HQ/Cognis/commit/a59ae79222ed483ba3804bf4cdebba9beaa75203)
- [393b357](https://github.com/Cognis-Labs-HQ/Cognis/commit/393b357411ab2f828c785afc53a831ccc9dda626)
- [8c1364c](https://github.com/Cognis-Labs-HQ/Cognis/commit/8c1364cb57d291083ef77d39453787892a951d80)
