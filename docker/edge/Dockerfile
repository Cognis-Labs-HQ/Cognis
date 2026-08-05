FROM nginx:1.27-alpine

RUN apk add --no-cache nginx-mod-http-brotli \
  && rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /docker-entrypoint.d/40-cognis-edge-mode.sh

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
