# Node 24, a mesma versão usada em desenvolvimento e na CI. O 20
# saiu do suporte em abril de 2026 e não atende o que o jsdom exige.
FROM node:24-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# 2. Build com verificação de tipos.
# Antes o tsc era pulado de propósito, porque travava com erros, e a
# imagem publicava código que não compilava. Os erros foram corrigidos
# em 19/08/2026 e o type-check voltou para o caminho do build.
RUN npm run build

# Estágio de Servidor (Nginx) - Mantivemos a otimização de PWA
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location /assets/ { \
        expires 1y; \
        add_header Cache-Control "public, no-transform"; \
    } \
    location ~* (sw\.js|service-worker\.js|manifest\.json)$ { \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
        expires 0; \
    } \
    location / { \
        try_files $uri $uri/ /index.html; \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]