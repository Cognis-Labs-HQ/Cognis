# Shared Email Code Length

**Feature Branch:** feature-smtp-email-code-integration

## One SMTP setting for email codes

The Notification SMTP Code Length field governs email verification and Email Code TFA setup and login. Its localized information tooltip explains the shared policy, the 6-digit default and the 4–10-digit range. Consumers read the current SMTP policy when issuing a code; they do not store a second code-length setting. Blank numeric configuration fields preserve their existing value.

## Existing challenges keep their length

Changing the SMTP setting affects newly issued codes, including replacements requested by resend. Pending setup and login challenges retain their issued length until used, replaced or expired, and setup and login inputs use the active challenge’s length metadata. Required-email verification accepts the complete pending code without a separate fixed input limit.

Resuming a pending sign-in after a page reload preserves its issued input length without sending another code. A later provider-policy change applies to newly issued challenges; an older response cannot replace a newer sign-in prompt.

## Unavailable senders fail explicitly

Email-verification and Email Code TFA issuance require an available, configured SMTP policy owner. Missing or disabled owners do not silently fall back to a consumer default. SMTP method disable and gateway shutdown clear pending challenges; re-enable starts with fresh state.

## Extension contract and safe configuration

The standalone `notify:emailCodeLength` capability is removed. Extension consumers must read `notify:emailDeliveryPolicy().codeLength`; deploy the Notification gateway and both email adapters together. Provider configuration is normalized and persisted before runtime application. A failed application disables the provider and restores its previous saved configuration in the disabled state for administrator recovery. Ordinary SMTP authentication and email-verification consent are unchanged.

Configuration saves, patches, activation changes and persisted reloads are serialized per sender, including failed-save rollback. Different senders remain independent. Replacing a registered sender while its configuration work is pending fails explicitly; replacement can proceed once that work finishes. Configuration listeners run after the transaction is released, so they may await a subsequent update. The `notify:onSenderConfigChange` payload excludes all fields declared as `password` in the provider schema or listed by `getConfiguredSecretFields()`, including newly submitted values. Public normalized fields and activation state remain available; listeners must not rely on raw credentials.

## Commits

- [55da5f3d0f7695d4cf5ea17438be5744857c3a7b](https://github.com/Cognis-Labs-HQ/Cognis/commit/55da5f3d0f7695d4cf5ea17438be5744857c3a7b)
- [8d2f4505fdd739d60dd8b82d2529d0dd30e87f40](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d2f4505fdd739d60dd8b82d2529d0dd30e87f40)
- [ef8da51a32748d419b9b46e0bf145b65fed73678](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef8da51a32748d419b9b46e0bf145b65fed73678)
- [8dd1b77ec99af1e828aaaddb10b8b47592206259](https://github.com/Cognis-Labs-HQ/Cognis/commit/8dd1b77ec99af1e828aaaddb10b8b47592206259)
- [3a857dd36040f814548f68386c3438b7653b533f](https://github.com/Cognis-Labs-HQ/Cognis/commit/3a857dd36040f814548f68386c3438b7653b533f)
