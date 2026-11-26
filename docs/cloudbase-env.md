# ========================================
# CloudBase 环境变量配置指南
# ========================================
# 在 CloudBase 控制台的「服务配置」→「环境变量」中添加以下变量

# ========================================
# 必需变量（Supabase 数据库）
# ========================================

# Supabase 项目 URL
# 获取方式：Supabase 控制台 → 项目设置 → API → Project URL
COZE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Supabase 匿名密钥（anon key）
# 获取方式：Supabase 控制台 → 项目设置 → API → Project API keys → anon public
COZE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx

# ========================================
# 可选变量
# ========================================

# 服务端口（默认 9091，CloudBase 会自动设置）
# PORT=9091

# 运行环境
# NODE_ENV=production

# ========================================
# Coze 工作流变量（其他仍使用工作流的功能才需要）
# ========================================

# 扣子工作流 API Token，只能配置在后端环境变量里，不要写进小程序代码
COZE_WORKFLOW_TOKEN=pat_xxxxxxxxxxxxxxxxx

# 默认使用 https://api.coze.cn/v1/workflow/run，一般不用改
# COZE_WORKFLOW_API_URL=https://api.coze.cn/v1/workflow/run

# 找回密码邮件服务（只放在后端）
# RESEND_API_KEY：在 Resend 控制台创建 API Key
# EMAIL_FROM：已在 Resend 验证的发件地址，例如 智能非遗 <account@example.com>
# PASSWORD_RESET_SECRET：自定义随机长字符串，用于保护验证码哈希
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
EMAIL_FROM=智能非遗 <account@example.com>
PASSWORD_RESET_SECRET=replace-with-a-long-random-secret

# 图片/音频对象存储
# 新变量优先；如果已配置旧变量 S3_BUCKET、S3_REGION、S3_ACCESS_KEY_ID、S3_SECRET_ACCESS_KEY，代码会自动兼容。
# 使用 S3_* 密钥时不需要配置 COZE_WORKLOAD_IDENTITY_API_KEY。
COZE_BUCKET_ENDPOINT_URL=https://your-bucket.cos.ap-shanghai.myqcloud.com
COZE_BUCKET_NAME=your-bucket-1234567890
COZE_BUCKET_REGION=ap-shanghai

# ========================================
# 飞书多维表格（玩非遗、创非遗必需）
# ========================================

# 飞书开放平台应用凭证，只能放在后端环境变量中
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxx

# 多维表格链接中 /base/ 后面的标识
FEISHU_BITABLE_APP_TOKEN=xxxxxxxxxxxxxxxx

# 非遗数据库网址中 table= 后面的标识；玩非遗和创非遗共用
FEISHU_BITABLE_PRODUCT_TABLE_ID=tbl0Gv2jcy1C170G

# ========================================
# 注意事项
# ========================================
# 1. COZE_WORKFLOW_TOKEN、FEISHU_APP_SECRET 只能放在 CloudBase 后端环境变量中，不能放进小程序。
# 2. 海报、节日卡、生日卡、新年卡是同一张表的不同视图，不需要分别配置 ID。
# 3. 请将 xxxxxxxxxxx 替换为你的实际值。
# 4. 拍非遗走后端直接生图；玩非遗、创非遗共用上述数据表，按“非遗形式”精确筛选卡片类型或“产品”。
# 5. “非遗名称”是内容标题，按非遗大类关键词包含匹配；如景德镇陶瓷使用“景德镇/陶瓷/青花瓷/瓷器”，不要求完整项目名，合并同一形式的全部相关记录。
# 6. 两者都直接调用大模型和生图接口，不调用 Coze 工作流；未配置 RESEND_API_KEY 和 EMAIL_FROM 时，忘记密码页面不能发送验证码。
