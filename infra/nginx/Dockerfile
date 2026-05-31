FROM nginx:1.27-alpine
# We need a full nginx.conf with both http {} (driver API proxy) and stream {}
# (WebRTC UDP media), which the default conf.d include cannot host. The entrypoint
# runs envsubst on templates and writes the result to NGINX_ENVSUBST_OUTPUT_DIR,
# so the template renders straight to /etc/nginx/nginx.conf with the upstream IPs
# (${API_UPSTREAM}, ${MEDIA_UPSTREAM}) injected from the environment.
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template
EXPOSE 80
EXPOSE 8189/udp
