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
# Coze 工作流变量（接大模型工作流必需）
# ========================================

# 扣子工作流 API Token，只能配置在后端环境变量里，不要写进小程序代码
COZE_WORKFLOW_TOKEN=pat_xxxxxxxxxxxxxxxxx

# 默认使用 https://api.coze.cn/v1/workflow/run，一般不用改
# COZE_WORKFLOW_API_URL=https://api.coze.cn/v1/workflow/run

# 图片/音频对象存储
# 新变量优先；如果已配置旧变量 S3_BUCKET、S3_REGION、S3_ACCESS_KEY_ID、S3_SECRET_ACCESS_KEY，代码会自动兼容。
# 使用 S3_* 密钥时不需要配置 COZE_WORKLOAD_IDENTITY_API_KEY。
COZE_BUCKET_ENDPOINT_URL=https://your-bucket.cos.ap-shanghai.myqcloud.com
COZE_BUCKET_NAME=your-bucket-1234567890
COZE_BUCKET_REGION=ap-shanghai

# 玩非遗工作流
COZE_WORKFLOW_PLAY_POSTER=7664277744931356714
COZE_WORKFLOW_PLAY_FESTIVAL=7664277928193556534
COZE_WORKFLOW_PLAY_BIRTHDAY=7657855187197231155
COZE_WORKFLOW_PLAY_NEWYEAR=7651475766619078719
COZE_WORKFLOW_PLAY_DYNAMIC=7664273298331287552
COZE_WORKFLOW_PLAY_AVATAR=7664277197901512740
COZE_WORKFLOW_PLAY_INTERACTIVE=7664260581930844206

# 创非遗工作流
COZE_WORKFLOW_USE_FASHION=7639041545900245007
COZE_WORKFLOW_USE_HOME=7651488708608950314
COZE_WORKFLOW_USE_ART=7651590834337300499
COZE_WORKFLOW_USE_GIFTS=7657855187197231155

# ========================================
# 注意事项
# ========================================
# 1. COZE_WORKFLOW_TOKEN 只能放在 CloudBase 后端环境变量中，不能放进小程序。
# 2. 工作流 ID 已按当前版本填入，如在扣子里复制了新工作流，可只改对应变量。
# 3. 请将 xxxxxxxxxxx 替换为你的实际值。
