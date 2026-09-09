FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY apps/api ./apps/api
COPY database ./database

RUN npm run build


FROM build AS production-deps

RUN npm prune --omit=dev


FROM node:24-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production

# npm is not needed at runtime.
# Remove it and its bundled dependency tree from the final image.
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm \
    /usr/local/bin/npx

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist/apps/api ./dist/apps/api

USER node

EXPOSE 3000

CMD ["node", "dist/apps/api/src/index.js"]
