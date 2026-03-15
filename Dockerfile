# 使用 Node.js 22
FROM node:22-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制整个项目（.dockerignore 会过滤不需要的文件）
COPY . .

# 进入 server 目录，安装依赖并构建
WORKDIR /app/server
RUN pnpm install --ignore-scripts && pnpm run build

# 暴露端口
EXPOSE 9091

# 启动命令
CMD ["node", "dist/index.js"]
