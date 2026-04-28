// @ts-nocheck
/**
 * 通用认证上下文
 *
 * 基于固定的 API 接口实现，可复用到其他项目
 * 其他项目使用时，只需修改 @api 的导入路径指向项目的 api 模块
 *
 * 注意：
 * - 如果需要登录/鉴权场景，请扩展本文件，完善 login/logout、token 管理、用户信息获取与刷新等逻辑
 * - 将示例中的占位实现替换为项目实际的接口调用与状态管理
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 用户角色类型
export type UserRole = 'regular' | 'craftsman';

interface UserOut {
  id?: string;
  username?: string;
  email?: string;
  role?: UserRole;  // 'regular' 普通用户 / 'craftsman' 手艺人
}

interface AuthContextType {
  user: UserOut | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCraftsman: boolean;  // 是否是手艺人
  login: (token: string, userData?: UserOut) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<UserOut>) => void;
  setUserRole: (role: UserRole) => Promise<void>;  // 设置用户角色
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserOut | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 是否是手艺人
  const isCraftsman = user?.role === 'craftsman';

  // 初始化：从 AsyncStorage 恢复登录状态
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const savedToken = await AsyncStorage.getItem("auth_token");
        const savedUserStr = await AsyncStorage.getItem("auth_user");
        if (savedToken && savedUserStr) {
          setToken(savedToken);
          setUser(JSON.parse(savedUserStr));
        }
      } catch (error) {
        console.error("Failed to load auth state:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthState();
  }, []);

  const login = async (tokenValue: string, userData?: UserOut) => {
    try {
      await AsyncStorage.setItem("auth_token", tokenValue);
      setToken(tokenValue);
      if (userData) {
        await AsyncStorage.setItem("auth_user", JSON.stringify(userData));
        setUser(userData);
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("auth_user");
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const updateUser = (userData: Partial<UserOut>) => {
    setUser((prevUser) => ({ ...prevUser, ...userData }));
  };

  // 设置用户角色（注册时调用）
  const setUserRole = async (role: UserRole) => {
    const updatedUser = { ...user, role };
    await AsyncStorage.setItem("auth_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        isCraftsman,
        login,
        logout,
        updateUser,
        setUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
