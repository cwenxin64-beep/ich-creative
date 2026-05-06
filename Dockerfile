# 使用 Node.js 22
FROM node:22-alpine

# 设置 DNS 解析优先使用 IPv4（解决 Supabase 等外部服务 DNS 问题）
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 server 目录的所有文件（.dockerignore 会过滤 node_modules 等）
COPY server/package.json ./
COPY server/build.js ./
COPY server/tsconfig.json ./
COPY server/src ./src

# 安装依赖并构建
RUN pnpm install --ignore-scripts && pnpm run build

# 暴露端口
EXPOSE 9091

# 启动命令
CMD ["node", "dist/index.js"]
