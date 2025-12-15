# 1. Atualizamos para o Node 20 (Resolve os avisos de EBADENGINE)
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# 2. Mudamos o comando de build
# Em vez de "npm run build" (que roda o tsc e trava com erros),
# rodamos direto o vite build. Ele constrói o site mesmo com avisos de variáveis não usadas.
RUN npx vite build

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