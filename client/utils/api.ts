/**
 * 获取 API 基础 URL
 * - 开发环境：使用相对路径，由 Metro 代理到后端
 * - 生产环境：使用环境变量配置的后端地址
 */
export const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  // 开发环境使用相对路径，Metro 会代理到后端
  return '';
};

/**
 * 构建 API 请求 URL
 * @param path API 路径，如 '/api/v1/photo/generate'
 */
export const buildApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};
