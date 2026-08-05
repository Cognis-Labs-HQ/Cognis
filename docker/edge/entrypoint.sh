#!/bin/sh
set -eu

mode="${COGNIS_EDGE_TLS_MODE:-terminate}"
case "$mode" in
  terminate|deferred) ;;
  *)
    echo "COGNIS_EDGE_TLS_MODE must be 'terminate' or 'deferred'" >&2
    exit 1
    ;;
esac

if [ "$mode" = "terminate" ]; then
  cat > /etc/nginx/conf.d/cognis-edge.conf <<'TERMINATE'
server {
    listen 80;
    return 308 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;
    ssl_certificate /etc/nginx/tls/fullchain.pem;
    ssl_certificate_key /etc/nginx/tls/privkey.pem;

    location ~* ^/(?:static|assets)/.*[.-][0-9a-f]{8,}[.-] {
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
else
  cat > /etc/nginx/conf.d/cognis-edge.conf <<'DEFERRED'
server {
    listen 80;
    server_name _;

    location ~* ^/(?:static|assets)/.*[.-][0-9a-f]{8,}[.-] {
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
