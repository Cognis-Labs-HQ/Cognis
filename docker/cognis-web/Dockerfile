FROM nginx:stable-alpine

ENV HOST=cognis \
    COGNIS_WEB_TLS_CERTIFICATE=/etc/nginx/tls/fullchain.pem \
    COGNIS_WEB_TLS_CERTIFICATE_KEY=/etc/nginx/tls/privkey.pem

RUN apk add --no-cache --upgrade nginx nginx-mod-http-brotli

COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /docker-entrypoint.d/40-cognis-web-mode.sh

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
