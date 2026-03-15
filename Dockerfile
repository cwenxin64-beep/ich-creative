FROM node:18-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制所有文件到容器
COPY . ./

# 进入 server 目录工作
WORKDIR /app/server

# 安装依赖（跳过 postinstall 避免冲突）
RUN pnpm install --ignore-scripts

# 构建
RUN pnpm run build

# 暴露端口
EXPOSE 9091

# 启动命令
CMD ["node", "dist/index.js"]
