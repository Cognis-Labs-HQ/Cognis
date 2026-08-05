FROM nginx:stable-alpine

RUN apk add --no-cache --upgrade nginx nginx-mod-http-brotli

COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /docker-entrypoint.d/40-cognis-edge-mode.sh

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
