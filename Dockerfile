FROM node:18-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 先复制 package.json
COPY server/package.json ./package.json

# 安装依赖
RUN pnpm install

# 复制 server 目录的所有文件
COPY server/ ./

# 构建
RUN pnpm run build

# 暴露端口
EXPOSE 9091

# 启动命令
CMD ["node", "dist/index.js"]
