import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============ Types ============
export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============ Storage helpers ============
// AsyncStorage 同时支持 web 和原生平台
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  async deleteItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

const TOKEN_KEY = 'auth_access_token';
const REFRESH_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

// ============ API Base ============
function getApiBaseUrl(): string {
  // CloudBase 部署的 server 地址
  return 'https://ich-server-204193-6-1388119917.sh.run.tcloudbase.com';
}

// ============ Provider ============
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const segments = useSegments();

  // 从本地存储恢复登录状态
  const restoreAuth = useCallback(async () => {
    try {
      const savedToken = await storage.getItem(TOKEN_KEY);
      const savedRefreshToken = await storage.getItem(REFRESH_KEY);
      const savedUser = await storage.getItem(USER_KEY);

      if (savedToken && savedUser) {
        setToken(savedToken);
        setRefreshTokenValue(savedRefreshToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('[AUTH] Failed to restore auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreAuth();
  }, [restoreAuth]);

  // 保存登录状态到本地存储
  const persistAuth = async (newToken: string, newRefreshToken: string, newUser: User) => {
    await storage.setItem(TOKEN_KEY, newToken);
    await storage.setItem(REFRESH_KEY, newRefreshToken);
    await storage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setRefreshTokenValue(newRefreshToken);
    setUser(newUser);
  };

  // 清除登录状态
  const clearAuth = async () => {
    await storage.deleteItem(TOKEN_KEY);
    await storage.deleteItem(REFRESH_KEY);
    await storage.deleteItem(USER_KEY);
    setToken(null);
    setRefreshTokenValue(null);
    setUser(null);
  };

  // 邮箱+密码登录
  const loginWithEmail = async (email: string, password: string) => {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '登录失败');
    }

    await persistAuth(data.accessToken, data.refreshToken, data.user);
  };

  // 邮箱+密码注册
  const registerWithEmail = async (username: string, email: string, password: string) => {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '注册失败');
    }

    await persistAuth(data.accessToken, data.refreshToken, data.user);
  };

  // 刷新 token
  const refreshAuth = async () => {
    if (!refreshTokenValue) {
      await clearAuth();
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      const data = await response.json();

      if (!data.success) {
        await clearAuth();
        return;
      }

      await persistAuth(data.accessToken, data.refreshToken, data.user);
    } catch {
      await clearAuth();
    }
  };

  // 登出
  const logout = async () => {
    await clearAuth();
  };

  // 更新用户信息
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      storage.setItem(USER_KEY, JSON.stringify(updatedUser));
    }
  };

  // 路由守卫：根据登录状态自动跳转
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

    if (!user && !inAuthGroup) {
      // 未登录且不在登录页 → 跳转到登录页
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // 已登录且在登录页 → 跳转到首页
      router.replace('/(tabs)/home');
    }
  }, [user, isLoading, segments]);

  const value: AuthContextType = {
    user,
    token,
    refreshToken: refreshTokenValue,
    isAuthenticated: !!user,
    isLoading,
    loginWithEmail,
    registerWithEmail,
    logout,
    refreshAuth,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
