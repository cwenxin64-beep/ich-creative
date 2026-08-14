# 智能非遗微信小程序

这是从现有 Expo 前端迁移出的微信原生小程序版本，后端继续使用现有 Express 服务。普通用户可以提交定制需求单，手艺人可以在“创非遗”里接单。

## 打开方式

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择本目录：`miniprogram`。
4. AppID 可以先使用测试号，正式发布前替换 `project.config.json` 里的 `appid`。

## 已迁移页面

- 首页
- 欢迎页
- 登录
- 注册
- 手艺人注册
- 拍非遗
- 唱非遗
- 玩非遗
- 创非遗
- 我的收藏
- 我的素材
- 作品详情

## 后端地址

当前使用：

```text
https://cc-4gicfmjy884d01bf-1388119917.ap-shanghai.app.tcloudbase.com
```

请求和上传都会带 `X-WX-SERVICE: ich-server`，用于路由到当前项目的云托管服务。

如需修改，编辑：

```text
miniprogram/utils/api.js
```

## 发布前必须配置

在微信小程序后台配置合法域名：

- request 合法域名：`https://cc-4gicfmjy884d01bf-1388119917.ap-shanghai.app.tcloudbase.com`
- uploadFile 合法域名：`https://cc-4gicfmjy884d01bf-1388119917.ap-shanghai.app.tcloudbase.com`
- downloadFile 合法域名：按实际图片、音频、视频资源域名配置

## 定制需求单

- 普通用户账号：在“创非遗”提交定制需求单，并查看自己的订单状态。
- 手艺人账号：在“创非遗”进入接单大厅，查看待接单订单并接单。
- 后端已预留支付接口 `/api/v1/use/customization-orders/:id/payment-intent`，当前不调用真实支付。

## 已知限制

- 拍非遗上传使用 `wx.uploadFile` 直接提交给 `ich-server`。
- 小程序没有依赖 npm 包，直接使用微信原生页面、请求、上传和音频能力。
