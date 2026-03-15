# 使用多阶段构建，第一阶段在 server 目录工作
FROM node:18-alpine AS builder

WORKDIR /build

# 安装 pnpm
RUN npm install -g pnpm

# 复制所有文件
COPY . ./

# 进入 server 目录并构建
WORKDIR /build/server
RUN pnpm install --ignore-scripts
RUN pnpm run build

# 第二阶段：生产镜像
FROM node:18-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 只复制 server 目录的内容
COPY --from=builder /build/server/package.json ./
COPY --from=builder /build/server/dist ./dist
COPY --from=builder /build/server/node_modules ./node_modules

# 暴露端口
EXPOSE 9091

# 启动命令
CMD ["node", "dist/index.js"]
