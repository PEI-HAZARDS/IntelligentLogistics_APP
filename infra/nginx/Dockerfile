FROM nginx:1.27-alpine
# Replace the main config — we need both http {} (driver API proxy) and
# stream {} (WebRTC UDP media), which the default conf.d include cannot host.
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
EXPOSE 8189/udp
