# Local Authentication Adapter

Authenticates users against locally stored hashed credentials.

## Configuration

No configurable fields. Credentials are managed via the `user:*` CLI commands.

## Usage

The local adapter is always enabled and cannot be disabled. It is the default provider for `POST /api/v1/auth/login`.
