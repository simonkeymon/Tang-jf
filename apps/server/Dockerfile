FROM node:20-alpine AS build
WORKDIR /app
COPY . /app
RUN corepack enable && corepack prepare pnpm@8.15.8 --activate && pnpm install --frozen-lockfile=false && pnpm --filter @tang/server build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/server/dist /app/apps/server/dist
COPY --from=build /app/apps/server/package.json /app/apps/server/package.json
ENV NODE_ENV=production
CMD ["node", "/app/apps/server/dist/server.js"]
