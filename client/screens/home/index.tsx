import React, { useMemo } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

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
      title: '说非遗',
      subtitle: '音频创作',
      icon: 'microphone',
      color: '#D4A574',
      description: '录制或上传音频，生成创意作品',
      route: '/audio'
    },
    {
      id: 'play',
      title: '玩非遗',
      subtitle: '交互创作',
      icon: 'magic-wand-sparkles',
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
    </Screen>
  );
}
