# SMTP TFA Adapter

## Overview

The SMTP TFA adapter adds email-code second-factor support to the TFA gateway. It sends setup and login verification codes to the user's primary email using the Notification gateway's SMTP verification-email flow.

## Requirements

- Notification gateway must expose verification-email delivery.
- SMTP sender must be configured and enabled in Notification gateway administration.
- User account must have a verified primary email address.

## Configuration

- `codeLength` (number, optional): Length of generated numeric codes. Values are clamped to 4–10 digits.

## Runtime behavior

- Challenge codes are stored in process memory. Restarting the app invalidates pending setup/login codes.
- In multi-instance deployments, this adapter should only be used when requests are pinned to the same instance during a challenge window.
