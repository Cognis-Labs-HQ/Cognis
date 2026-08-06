# Reliable reverse-proxy HTTP discovery

## Prevent TLS-terminating proxies from selecting the TLS upstream

The `cognis-web` image now advertises only its HTTP port for automatic service
discovery. Traefik and similar TLS-terminating proxies therefore select port 80
instead of accidentally sending plain HTTP to port 443 and receiving a 421
Misdirected Request response.
