FROM node:20-alpine AS build
WORKDIR /app
COPY . /app
RUN corepack enable && corepack prepare pnpm@8.15.8 --activate && pnpm install --frozen-lockfile=false && pnpm --filter @tang/web build

FROM nginx:1.27-alpine
COPY nginx.web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
