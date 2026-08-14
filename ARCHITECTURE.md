# 项目结构说明

## 主要目录

- `client/`：Expo 前端，负责原来的 App/Web 版本页面。
- `server/`：Express 后端，负责登录、生成任务、收藏、素材、分享、定制需求单和接单接口。
- `miniprogram/`：微信原生小程序版本，复用现有后端接口。
- `assets/`：项目图片和历史日志资源。
- `patches/`：Expo 补丁。
- `eslint-plugins/`：本地 ESLint 规则。

## 小程序模块

- `miniprogram/app.json`：小程序页面、窗口和底部导航配置。
- `miniprogram/app.wxss`：全局样式。
- `miniprogram/utils/api.js`：后端地址、请求、上传、登录状态、轮询工具。
- `miniprogram/utils/constants.js`：非遗类型、曲风、场景等选项。
- `miniprogram/utils/format.js`：收藏、素材、日期、链接参数整理。
- `miniprogram/pages/home/`：小程序首页。
- `miniprogram/pages/photo/`：拍非遗，调用图片生成接口。
- `miniprogram/pages/audio/`：唱非遗，调用音乐生成接口。
- `miniprogram/pages/play/`：玩非遗，调用互动作品生成接口。
- `miniprogram/pages/use/`：创非遗；普通用户提交需求单并查看订单，手艺人查看接单大厅并接单，同时保留 AI 定制生成。
- `miniprogram/pages/artisan-register/`：注册手艺人账号，写入 `craftsman` 角色。
- `miniprogram/pages/favorites/`：收藏列表、删除、同步素材。
- `miniprogram/pages/materials/`：素材列表、筛选、同步、删除。
- `miniprogram/pages/detail/`：图片、视频、音频详情展示。

## 调用关系

- 小程序页面调用 `miniprogram/utils/api.js`。
- `api.js` 请求 `server/src/routes/*` 中已有接口。
- 生成类页面先创建任务，再轮询状态接口。
- 收藏页把收藏同步到素材，素材页读取同步结果。
- 普通用户通过 `POST /api/v1/use/customization-order` 提交定制需求单。
- 手艺人通过 `GET /api/v1/use/customization-orders` 查看待接单，通过 `POST /api/v1/use/customization-orders/:id/accept` 接单。

## 关键决定

- 小程序采用微信原生格式，原因是不需要外网安装新框架，也不影响现有 Expo 版本。
- 后端继续复用现有 Express 服务，原因是生成、收藏、素材、分享逻辑都已在后端实现。
- `miniprogram` 独立成目录，原因是可以直接导入微信开发者工具，同时保留原来的前端代码。
- 定制订单表预留支付字段和支付意向接口，原因是后续接微信支付时不需要重建订单主流程。
