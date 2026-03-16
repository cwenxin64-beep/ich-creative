import Constants from 'expo-constants';

/**
 * 获取 API 基础 URL
 * - 优先从 Constants.expoConfig.extra.backendBaseUrl 获取（构建时注入）
 * - 其次从环境变量获取
 * - 开发环境使用相对路径
 */
export const getApiBaseUrl = (): string => {
  // 从 app.config.ts 的 extra 字段获取（最可靠）
  const extraBackendUrl = (Constants.expoConfig?.extra as any)?.backendBaseUrl;
  if (extraBackendUrl) {
    return extraBackendUrl.replace(/\/$/, '');
  }

  // 从环境变量获取
  if (process.env.EXPO_PUBLIC_BACKEND_BASE_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_BASE_URL.replace(/\/$/, '');
  }

  // 开发环境使用相对路径
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
