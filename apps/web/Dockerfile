FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

COPY apps/web/ ./

RUN npm run build


FROM nginx:1.29-alpine AS production

RUN apk upgrade --no-cache

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

