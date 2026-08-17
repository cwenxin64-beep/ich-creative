# 当前进度

- 已把项目转出一份微信原生小程序版本，目录是 `miniprogram`。
- 现有 Expo 前端和 Express 后端未被替换。
- 已按原 Expo 版视觉重新调整小程序 UI，重点复原首页功能卡、创作页分组卡片和上传区层级。
- 已新增小程序兼容入口 `pages/index/index`，用于避免体验版入口仍指向默认首页时显示界面不存在。
- 已新增小程序兼容入口 `pages/home/home`，用于兼容体验码里指定的旧路径。
- 已修复小程序拍非遗页生成后无法顺畅继续拍下一张的问题。
- 已修复小程序首页白屏风险：真实首页改为默认入口，兼容入口失败时改用 `reLaunch`，首页用户信息不再直接读取空对象字段。
- 用户反馈所有微信开发者工具项目都白屏，判断重点转为开发者工具本身缓存/渲染问题；已把本项目私有配置里的热重载关闭以减少干扰。
- 拍非遗上传时报 `Client network socket disconnected before secure TLS connection was established`；本机测试显示 443 端口可达，但 Windows Schannel 对多个 HTTPS 域名握手失败，优先判断为本机/开发者工具网络 TLS 问题，不是上传接口代码逻辑问题。
- 已补齐普通用户定制需求单到手艺人接单的最小闭环，并预留支付意向接口。
- 本次临时文档任务已完成：已解压 `第一期推文2.zip`，生成图文排版 Word。
- 已按用户追加要求生成 `第一期推文2_Markdown格式.docx`，Word 内显示 Markdown 语法并保留图片预览。
- 已生成本次部署包，输出目录是 `deploy/ich-20260812-150224`。
- 已把当前小程序、后端和文档相关改动推送到 GitHub 新分支 `agent/miniprogram-order-flow`。
- 已给小程序补上登录态自动续期：接口返回 401 时会用 refresh token 刷新登录，再重试原请求。
- 已给创非遗需求单补上参考作品能力：用户可选择本次生成作品或收藏作品，手艺人接单时能看到参考图。

# 上次停在

- 小程序页面、公共请求层、登录存储、生成轮询、收藏、素材、详情已落地。
- 小程序 UI 已从普通宫格改为更接近原版的横向功能卡和毛玻璃卡片。
- 拍非遗页现在生成结果后可以继续拍摄、从相册换图或重新开始。
- 首页启动链已修正，`pages/index/index` 和 `pages/home/home` 只作为兼容中转入口。
- 当前白屏若在所有项目都出现，优先处理微信开发者工具缓存、进程和渲染设置，不再按单个小程序代码问题排查。
- 当前上传失败若继续出现，优先检查开发者工具本地设置、系统网络、VPN/代理/安全软件 HTTPS 拦截，真机网络也要单独验证。
- 普通用户在小程序“创非遗”里提交需求单并查看自己的订单；手艺人账号进入同页会看到接单大厅和自己的接单。
- 手艺人注册页现在直接注册 `craftsman` 角色账号，注册成功后可登录接单。
- 已新增 `ARCHITECTURE.md`，并更新 `README.md` 和 `miniprogram/README.md`。
- 文档成品在 `第一期推文2_成品/第一期推文2_图文排版.docx`，同目录保留 Markdown 源稿。
- Markdown 格式 Word 在 `第一期推文2_成品/第一期推文2_Markdown格式.docx`。
- 部署包已分成后端包和小程序包：后端上传 CloudBase `ich-server`，小程序用微信开发者工具导入或上传。
- GitHub 远程仓库是 `https://github.com/cwenxin64-beep/ich-creative.git`，本次推送分支是 `agent/miniprogram-order-flow`，提交是 `a8e9013`。
- 小程序公共请求层已支持普通请求和图片上传的登录自动续期。
- 创非遗需求单里已增加参考作品选择区；生成结果卡片可一键作为定制参考。

# 近期关键决定

- 采用微信原生小程序格式，不新增 Taro 依赖，原因是当前环境不需要联网安装新框架。
- 小程序继续复用现有 Express 后端，后端地址集中在 `miniprogram/utils/api.js`。
- 用户确认当前项目不用微信云开发，小程序已改回普通 HTTPS 请求。
- 小程序普通接口使用 `wx.request`，上传图片使用 `wx.uploadFile`。
- 当前小程序后端入口改为 `https://cc-4gicfmjy884d01bf-1388119917.ap-shanghai.app.tcloudbase.com`。
- 小程序请求和上传都会带 `X-WX-SERVICE: ich-server`，用于路由到当前云托管服务。
- 小程序拍非遗上传已改回 `wx.uploadFile`；后端 `/api/v1/photo/generate` 仍兼容 base64 和原 multipart 两种格式。
- `server/build.js` 的入口已改为明确相对路径 `./src/index.ts`。
- 已移除 `wx.cloud.init`、`wx.cloud.callContainer` 和 `app.json` 里的云开发开关。
- 拍非遗页新增统一清理上一轮生成状态的方法，换图、继续拍摄、重新开始都会先清掉旧作品结果。
- 唱非遗、玩非遗、创非遗页面已同步检查，它们在新一轮生成开始时会清空旧结果，当前没有同类阻塞点。
- 小程序 tabBar 页面必须使用 `switchTab` 或 `reLaunch` 打开，不能用 `redirectTo` 打开。
- 后端新增 `customization_orders` 表，状态包括 `pending/accepted/completed/canceled`，支付字段包括 `payment_status/payment_amount/payment_provider/payment_order_id`。
- 后端新增接口：提交需求单、查询需求单、手艺人接单、创建支付意向；支付意向接口当前只预留，不调用真实支付。
- 文档处理使用原 Word 正文作底稿，按 Markdown 语义整理标题、正文和图片位置。
- Markdown 格式 Word 不覆盖原图文版，原因是两种用途不同：一个用于阅读，一个用于查看 Markdown 写法。
- 部署包不包含 `.env`、`node_modules`、本地缓存和小程序私有配置，原因是这些不应该上传到正式部署环境。
- GitHub 推送没有直接覆盖 `main`，原因是远程仓库已有历史；本次使用基于远程 `main` 的新分支，避免误覆盖。
- 登录续期只在非登录、非注册、非刷新接口收到 401 时触发，最多重试原请求一次，避免循环请求。
- 参考作品保存在订单 `metadata.referenceWork`，不新增数据库字段，避免影响后续支付字段和旧订单。
