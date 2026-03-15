# 在根目录构建
FROM node:18-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制整个仓库
COPY . /tmp/repo/

# 切换工作目录
WORKDIR /app/server

# 复制 server 目录内容
RUN cp -r /tmp/repo/server/* /app/server/ && rm -rf /tmp/repo

# 安装依赖
RUN pnpm install --ignore-scripts

# 构建
RUN pnpm run build

# 暴露端口
EXPOSE 9091

# 启动命令
CMD ["node", "dist/index.js"]
