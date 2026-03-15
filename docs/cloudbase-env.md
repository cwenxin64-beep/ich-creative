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
# 注意事项
# ========================================
# 1. coze-coding-dev-sdk 会自动从请求头获取认证信息，无需配置 API Key
# 2. 只有 Supabase 数据库需要配置环境变量
# 3. 请将 xxxxxxxxxxx 替换为你的实际值
