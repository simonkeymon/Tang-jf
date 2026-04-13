FROM node:20-alpine AS build
WORKDIR /app
COPY . /app
RUN corepack enable && corepack prepare pnpm@8.15.8 --activate && pnpm install --frozen-lockfile=false && pnpm --filter @tang/admin build

FROM nginx:1.27-alpine
COPY nginx.admin.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
