ARG NGINX_VERSION=1.27.5

FROM nginx:${NGINX_VERSION}-alpine AS brotli-builder
ARG NGINX_VERSION

RUN apk add --no-cache \
  build-base \
  git \
  linux-headers \
  openssl-dev \
  pcre2-dev \
  wget \
  zlib-dev

WORKDIR /tmp
RUN wget -qO nginx.tar.gz "https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz" \
  && tar -xzf nginx.tar.gz \
  && git clone --depth 1 --recurse-submodules https://github.com/google/ngx_brotli.git \
  && cd "nginx-${NGINX_VERSION}" \
  && ./configure --with-compat --add-dynamic-module=/tmp/ngx_brotli \
  && make modules

FROM nginx:${NGINX_VERSION}-alpine
ARG NGINX_VERSION

COPY --from=brotli-builder /tmp/nginx-${NGINX_VERSION}/objs/ngx_http_brotli_filter_module.so /etc/nginx/modules/ngx_http_brotli_filter_module.so
COPY --from=brotli-builder /tmp/nginx-${NGINX_VERSION}/objs/ngx_http_brotli_static_module.so /etc/nginx/modules/ngx_http_brotli_static_module.so
RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /docker-entrypoint.d/40-cognis-edge-mode.sh

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
