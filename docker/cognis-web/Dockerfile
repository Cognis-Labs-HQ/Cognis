FROM nginx:stable-alpine

RUN apk add --no-cache --upgrade nginx nginx-mod-http-brotli

COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /docker-entrypoint.d/40-cognis-web-mode.sh

# Advertise the unencrypted upstream port for reverse-proxy service discovery.
# Compose can still publish 443 explicitly when this container terminates TLS.
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
