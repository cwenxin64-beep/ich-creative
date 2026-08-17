# 智能非遗

## 项目功能简介

这是一个 AI 非遗创作项目，可以生成非遗风格图片、音乐、互动作品和实用设计，也支持普通用户提交定制需求单、手艺人接单。

## 技术架构

- `client/`：Expo 前端，负责原来的 App/Web 页面。
- `server/`：Express 后端，负责登录、生成任务、Coze 工作流调用、收藏、素材、分享、定制需求单和接单接口。
- `miniprogram/`：微信原生小程序，复用现有后端接口。

## 微信小程序版本

小程序目录：

```text
miniprogram/
```

打开方式：

1. 打开微信开发者工具。
2. 导入 `miniprogram` 目录。
3. 开发阶段可使用测试 AppID。
4. 正式发布前，把 `miniprogram/project.config.json` 里的 `appid` 换成正式小程序 AppID。

小程序后端地址在：

```text
miniprogram/utils/api.js
```

发布前需要在微信小程序后台配置合法域名：

```text
https://cc-4gicfmjy884d01bf-1388119917.ap-shanghai.app.tcloudbase.com
```

请求和上传都会带 `X-WX-SERVICE: ich-server`，用于路由到当前项目的云托管服务。

定制需求单接口：

- `POST /api/v1/use/customization-order`：普通用户提交需求单。
- `GET /api/v1/use/customization-orders`：普通用户看自己的单；手艺人看待接单和自己已接单。
- `POST /api/v1/use/customization-orders/:id/accept`：手艺人接单。
- `POST /api/v1/use/customization-orders/:id/payment-intent`：支付预留接口，当前不调用真实支付。

大模型工作流：

- `拍非遗`、`玩非遗`、`创非遗` 的生成入口已改为后端调用 Coze 工作流。
- 小程序不保存 Coze Token，只继续请求自己的后端。
- 后端部署时需要在 CloudBase 环境变量中配置 `COZE_WORKFLOW_TOKEN`。
- 工作流 ID 配置见 `docs/cloudbase-env.md`。

## 本地运行方法

Expo + Express 版本：

```bash
coze dev
```

微信小程序版本：用微信开发者工具导入 `miniprogram` 目录。

## 部署方法和命令

现有项目沿用原部署方式：

```bash
pnpm i
pnpm build
pnpm start
```

微信小程序需要在微信开发者工具中上传。

## 测试方法和常用命令

```bash
pnpm i
pnpm build
```

本次小程序迁移额外做了配置解析和脚本语法检查。

## 搜索记录

- `skills.sh`：已访问技能目录，没有找到专门针对“Expo 转微信小程序”的可直接使用技能。
- GitHub：搜索微信小程序、Taro、React、Express 迁移参考时没有返回稳定可复用结果。
- 结论：本次采用微信原生小程序格式直接迁移，避免新增外部依赖。

## 已完成功能

- Expo 前端主流程。
- Express 后端接口。
- 微信小程序版本：首页、登录注册、手艺人注册、拍非遗、唱非遗、玩非遗、创非遗、定制需求单、接单大厅、收藏、素材、详情。

## 待办事项

- 接入真实微信支付。
- 正式发布前配置微信小程序合法域名和正式 AppID。

## 目录结构规范（严格遵循）

当前仓库是一个 monorepo（基于 pnpm 的 workspace）

- Expo 代码在 client 目录，Express.js 代码在 server 目录
- 本模板默认无 Tab Bar，可按需改造

目录结构说明

├── server/                     # 服务端代码根目录 (Express.js)
|   ├── src/
│   │   └── index.ts            # Express 入口文件
|   └── package.json            # 服务端 package.json
├── client/                     # React Native 前端代码
│   ├── app/                    # Expo Router 路由目录（仅路由配置）
│   │   ├── _layout.tsx         # 根布局文件（必需，务必阅读）
│   │   ├── home.tsx            # 首页
│   │   └── index.tsx           # re-export home.tsx
│   ├── screens/                # 页面实现目录（与 app/ 路由对应）
│   │   └── demo/               # demo 示例页面
│   │       ├── index.tsx       # 页面组件实现
│   │       └── styles.ts       # 页面样式
│   ├── components/             # 可复用组件
│   │   └── Screen.tsx          # 页面容器组件（必用）
│   ├── hooks/                  # 自定义 Hooks
│   ├── contexts/               # React Context 代码
│   ├── constants/              # 常量定义（如主题配置）
│   ├── utils/                  # 工具函数
│   ├── assets/                 # 静态资源
|   └── package.json            # Expo 应用 package.json
├── package.json
├── .cozeproj                   # 预置脚手架脚本（禁止修改）
└── .coze                       # 配置文件（禁止修改）

## 安装依赖

### 命令

```bash
pnpm i
```

### 新增依赖约束

如果需要新增依赖，需在 client 和 server 各自的目录添加（原因：隔离前后端的依赖），禁止在根目录直接安装依赖

### 新增依赖标准流程

- 编辑 `client/package.json` 或 `server/package.json`
- 在根目录执行 `pnpm i`

## Expo 开发规范

### 路径别名

Expo 配置了 `@/` 路径别名指向 `client/` 目录：

```tsx
// 正确
import { Screen } from '@/components/Screen';

// 避免相对路径
import { Screen } from '../../../components/Screen';
```

## 本地开发

运行 coze dev 可以同时启动前端和后端服务，如果端口已占用，该命令会先杀掉占用端口的进程再启动，也可以用来重启前端和后端服务

```bash
coze dev
```
