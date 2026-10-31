# SMTP TFA Adapter

## Overview

The adapter registers its own code-message action during bootstrap through `notify:registerEmailPurpose` and sends through `notify:sendEmail`. Registration, code content and sender synchronization belong to this adapter. TFA Gateway provides only neutral adapter lifecycle hooks. Gateway disable cancels the owned SMTP queue; re-enable restores its registration.

## Requirements

- Notification gateway must expose verification-email delivery.
- SMTP sender must be configured and enabled in Notification gateway administration.
- User account must have a verified primary email address.

## Configuration

- `codeLength` (number, optional): Length of generated numeric codes. Values are clamped to 4–10 digits.

## Runtime behavior

- Challenge codes are stored in process memory. Restarting the app invalidates pending setup/login codes.
- In multi-instance deployments, this adapter should only be used when requests are pinned to the same instance during a challenge window.
