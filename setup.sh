#!/bin/sh
set -eu

runtime_env='docker/env/runtime.env'

if [ -f "$runtime_env" ]; then
    printf '%s\n' "$runtime_env already exists; leaving it unchanged."
    exit 0
fi

umask 077
mkdir -p docker/env
cat > "$runtime_env" <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 24)
MARIADB_PASSWORD=$(openssl rand -hex 24)
MARIADB_ROOT_PASSWORD=$(openssl rand -hex 24)
DATA_ENCRYPTION_KEY=$(openssl rand -hex 32)
EOF

printf '%s\n' "Created $runtime_env with generated deployment secrets."
