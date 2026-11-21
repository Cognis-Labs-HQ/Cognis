# Usage

Practical procedures for Email Delivery.

## Prerequisites

Administrators need SMTP access and an approved sender address.

## Examples

Enter host, port, encryption and sender details; send a test email before enabling routine delivery.

```sh
cognisctl email:list --help
cognisctl email:add --help
cognisctl email:remove --help
cognisctl email:primary --help
cognisctl email:verify:send --help
```

## Expected Results

A successful test confirms delivery to that address; account mail still follows verification and category policies.

## Troubleshooting

Inspect the test error, TLS mode, credentials and recipient mailbox. A successful connection does not guarantee inbox placement.
