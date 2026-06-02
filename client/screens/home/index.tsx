import React, { useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace('/welcome');
  };

  const features = [
    {
      id: 'photo',
      title: '拍非遗',
      subtitle: '视觉创作',
      icon: 'camera',
      color: '#B8860B',
      description: '拍照或上传图片，生成创意非遗产品',
      route: '/photo'
    },
    {
      id: 'audio',
      title: '唱非遗',
      subtitle: '音乐创作',
      icon: 'music',
      color: '#D4A574',
      description: '输入创意或歌词，生成非遗风格音乐',
      route: '/audio'
    },
    {
      id: 'play',
      title: '玩非遗',
      subtitle: '交互创作',
      icon: 'puzzle-piece',
      color: '#7BA05B',
      description: '文字输入生成海报、卡片、数字人',
      route: '/play'
    },
    {
      id: 'use',
      title: '用非遗',
      subtitle: '定制设计',
      icon: 'palette',
      color: '#C75B5B',
      description: '个性化定制非遗创意产品',
      route: '/use'
    },
  ];

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="displayMedium" color={theme.textPrimary}>
            智能非遗
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.subtitle}>
            用 AI 让非遗&quot;活&quot;在当代
          </ThemedText>
        </ThemedView>

        {/* User Info Section */}
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: theme.backgroundDefault }]}
          onPress={() => {
            if (isAuthenticated) {
              handleLogout();
            } else {
              router.push('/welcome');
            }
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.userAvatar, { backgroundColor: `${theme.primary}20` }]}>
            <FontAwesome6
              name={isAuthenticated ? 'user-check' : 'right-to-bracket'}
              size={24}
              color={theme.primary}
            />
          </View>
          <ThemedView level="root" style={styles.userInfo}>
            {isAuthenticated && user ? (
              <>
                <ThemedText variant="title" color={theme.textPrimary} style={styles.userName}>
                  {user.username}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  {user.email}
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText variant="title" color={theme.textPrimary} style={styles.userName}>
                  未登录
                </ThemedText>
                <ThemedText variant="caption" color={theme.primary}>
                  点击登录/注册
                </ThemedText>
              </>
            )}
          </ThemedView>
          <FontAwesome6
            name={isAuthenticated ? 'right-from-bracket' : 'chevron-right'}
            size={18}
            color={theme.textMuted}
          />
        </TouchableOpacity>

        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[styles.featureCard, { backgroundColor: theme.backgroundDefault }]}
              onPress={() => router.push(feature.route)}
              activeOpacity={0.7}
            >
              {/* Icon Container */}
              <View style={[styles.iconContainer, { backgroundColor: `${feature.color}15` }]}>
                <FontAwesome6 name={feature.icon} size={32} color={feature.color} />
              </View>

              {/* Content */}
              <ThemedView level="root" style={styles.featureContent}>
                <ThemedText variant="title" color={theme.textPrimary} style={styles.featureTitle}>
                  {feature.title}
                </ThemedText>
                <ThemedText variant="caption" color={feature.color} style={styles.featureSubtitle}>
                  {feature.subtitle}
                </ThemedText>
                <ThemedText variant="small" color={theme.textSecondary} style={styles.featureDescription}>
                  {feature.description}
                </ThemedText>
              </ThemedView>

              {/* Arrow Icon */}
              <View style={styles.arrowIcon}>
                <FontAwesome6 name="chevron-right" size={20} color={theme.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* My Favorites Button */}
        <TouchableOpacity
          style={[styles.favoritesButton, { backgroundColor: theme.backgroundDefault }]}
          onPress={() => router.push('/favorites')}
          activeOpacity={0.7}
        >
          <View style={[styles.favoritesIconContainer, { backgroundColor: `${'#EC4899'}15` }]}>
            <FontAwesome6 name="heart" size={28} color="#EC4899" />
          </View>
          <ThemedView level="root" style={styles.favoritesContent}>
            <ThemedText variant="title" color={theme.textPrimary} style={styles.favoritesTitle}>
              我的收藏
            </ThemedText>
            <ThemedText variant="small" color={theme.textSecondary} style={styles.favoritesDescription}>
              查看和管理收藏的创作作品
            </ThemedText>
          </ThemedView>
          <FontAwesome6 name="chevron-right" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Footer Info */}
        <ThemedView level="root" style={styles.footer}>
          <ThemedText variant="caption" color={theme.textMuted}>
            融合传统与现代，创造独特文化价值
          </ThemedText>
        </ThemedView>
      </ScrollView>
      {/* Logout Confirm Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText variant="title" color={theme.textPrimary} style={styles.modalTitle}>
              退出登录
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.modalMessage}>
              确定要退出当前账号吗？
            </ThemedText>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: `${theme.primary}15` }]}
                onPress={() => setShowLogoutConfirm(false)}
                activeOpacity={0.7}
              >
                <ThemedText variant="body" color={theme.primary}>取消</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: '#DC2626' }]}
                onPress={confirmLogout}
                activeOpacity={0.7}
              >
                <ThemedText variant="body" color="#FFFFFF">退出</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
