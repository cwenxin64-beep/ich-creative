# 构建阶段：安装完整依赖并编译后端
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9

COPY server/package.json ./
COPY server/build.js ./
COPY server/tsconfig.json ./
COPY server/src ./src

RUN pnpm install \
    && pnpm run build

# 生产依赖阶段：独立安装正式依赖，避免在云端执行 prune
FROM node:22-alpine AS production-dependencies

WORKDIR /app

RUN npm install -g pnpm@9

COPY server/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile --ignore-scripts \
    && pnpm rebuild sharp

# 运行阶段：只保留正式依赖、编译结果和中文字体
FROM node:22-alpine AS runtime

ENV NODE_OPTIONS="--dns-result-order=ipv4first"

WORKDIR /app

RUN apk add --no-cache font-wqy-zenhei

COPY --from=builder /app/package.json ./
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# 暴露端口
EXPOSE 9091

# 启动命令
CMD ["node", "dist/index.js"]
