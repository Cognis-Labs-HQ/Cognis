#!/bin/sh
set -eu

mode="${COGNIS_EDGE_TLS_MODE:-terminate}"
tls_certificate_path="${COGNIS_EDGE_TLS_CERTIFICATE:-/etc/nginx/tls/fullchain.pem}"
tls_certificate_key_path="${COGNIS_EDGE_TLS_CERTIFICATE_KEY:-/etc/nginx/tls/privkey.pem}"
case "$mode" in
  terminate|deferred) ;;
  *)
    echo "COGNIS_EDGE_TLS_MODE must be 'terminate' or 'deferred'" >&2
    exit 1
    ;;
esac

if [ "$mode" = "terminate" ]; then
  if [ ! -r "$tls_certificate_path" ] || [ ! -r "$tls_certificate_key_path" ]; then
    echo "TLS termination requires readable certificate and key files. Set COGNIS_EDGE_TLS_MODE=deferred when HTTPS terminates at an upstream reverse proxy or CDN." >&2
    echo "Missing or unreadable: $tls_certificate_path $tls_certificate_key_path" >&2
    exit 1
  fi

  cat > /etc/nginx/conf.d/default.conf <<'TERMINATE'
server {
    listen 80;
    return 308 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name _;
    ssl_certificate __COGNIS_TLS_CERTIFICATE__;
    ssl_certificate_key __COGNIS_TLS_CERTIFICATE_KEY__;

    location ~* "^/(?:static|assets)/.*[.-][0-9a-f]{8,}[.-]" {
        proxy_pass http://cognis_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_hide_header Set-Cookie;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    location ^~ /api/ {
        proxy_pass http://cognis_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "private, no-store" always;
    }

    location / {
        proxy_pass http://cognis_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-cache, must-revalidate" always;
    }
}
TERMINATE
  sed -i \
    -e "s#__COGNIS_TLS_CERTIFICATE__#$tls_certificate_path#g" \
    -e "s#__COGNIS_TLS_CERTIFICATE_KEY__#$tls_certificate_key_path#g" \
    /etc/nginx/conf.d/default.conf
else
  cat > /etc/nginx/conf.d/default.conf <<'DEFERRED'
server {
    listen 80;
    server_name _;

    location ~* "^/(?:static|assets)/.*[.-][0-9a-f]{8,}[.-]" {
        proxy_pass http://cognis_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $cognis_forwarded_proto;
        proxy_hide_header Set-Cookie;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    location ^~ /api/ {
        proxy_pass http://cognis_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $cognis_forwarded_proto;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "private, no-store" always;
    }

    location / {
        proxy_pass http://cognis_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $cognis_forwarded_proto;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-cache, must-revalidate" always;
    }
}
DEFERRED
fi
