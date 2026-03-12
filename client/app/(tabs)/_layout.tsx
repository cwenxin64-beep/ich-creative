import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.backgroundDefault,
          borderTopColor: theme.borderLight,
          // 移动端：标准高度 50px + 底部安全区
          // Web端：固定60px，无需安全区
          height: Platform.OS === 'web' ? 60 : 50 + insets.bottom,
          // 移动端：内容区域底部 padding 防止内容被遮挡
          paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom,
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarItemStyle: {
          // Web 兼容性强制规范：Web 端必须显式指定 item 高度
          height: Platform.OS === 'web' ? 60 : undefined,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => <FontAwesome6 name="house" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="photo"
        options={{
          title: '拍非遗',
          tabBarIcon: ({ color }) => <FontAwesome6 name="camera" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="audio"
        options={{
          title: '说非遗',
          tabBarIcon: ({ color }) => <FontAwesome6 name="microphone" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="play"
        options={{
          title: '玩非遗',
          tabBarIcon: ({ color }) => <FontAwesome6 name="wand-magic-sparkles" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="use"
        options={{
          title: '用非遗',
          tabBarIcon: ({ color }) => <FontAwesome6 name="palette" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
