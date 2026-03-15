FROM node:18-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json (从 server 子目录)
COPY server/package.json ./

# 安装依赖
RUN pnpm install

# 复制所有文件 (从 server 子目录)
COPY server/ ./

# 构建
RUN pnpm run build

# 暴露端口
EXPOSE 9091

# 启动命令
CMD ["node", "dist/index.js"]
