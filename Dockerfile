# Estágio de Build
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio de Servidor (Nginx)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração Nginx OTIMIZADA para PWA
# Cria o arquivo de configuração direto no comando
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # 1. Arquivos estáticos do Vite (js, css, imagens com hash) \
    # Cache longo (1 ano) pois se mudar, o nome do arquivo muda \
    location /assets/ { \
        expires 1y; \
        add_header Cache-Control "public, no-transform"; \
    } \
    \
    # 2. Service Worker e Manifest \
    # NUNCA cachear o SW, senão o app não atualiza \
    location ~* (sw\.js|service-worker\.js|manifest\.json)$ { \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
        expires 0; \
    } \
    \
    # 3. Index.html e outros \
    # Cache curto ou nenhum para garantir que o usuário pegue a versão nova \
    location / { \
        try_files $uri $uri/ /index.html; \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]