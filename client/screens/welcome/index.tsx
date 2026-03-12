import React, { useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

export default function WelcomeScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Logo Area */}
        <ThemedView level="root" style={styles.logoSection}>
          <View style={[styles.logoContainer, { backgroundColor: theme.backgroundDefault }]}>
            <FontAwesome6 name="vault" size={80} color={theme.primary} />
          </View>
          <ThemedText variant="displayMedium" color={theme.textPrimary} style={styles.title}>
            智能非遗
          </ThemedText>
          <ThemedText variant="h3" color={theme.textSecondary} style={styles.subtitle}>
            用 AI 让非遗&quot;活&quot;在当代
          </ThemedText>
        </ThemedView>

        {/* Features */}
        <ThemedView level="root" style={styles.featuresSection}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.featuresTitle}>
            四大核心功能
          </ThemedText>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: `${theme.primary}20` }]}>
                <FontAwesome6 name="camera" size={24} color={theme.primary} />
              </View>
              <View style={styles.featureText}>
                <ThemedText variant="title" color={theme.textPrimary}>拍非遗</ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  图像识别，智能创作
                </ThemedText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: `${theme.accent}20` }]}>
                <FontAwesome6 name="microphone" size={24} color={theme.accent} />
              </View>
              <View style={styles.featureText}>
                <ThemedText variant="title" color={theme.textPrimary}>说非遗</ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  语音输入，情感分析
                </ThemedText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: `${theme.success}20` }]}>
                <FontAwesome6 name="wand-magic-sparkles" size={24} color={theme.success} />
              </View>
              <View style={styles.featureText}>
                <ThemedText variant="title" color={theme.textPrimary}>玩非遗</ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  文字创作，多种形式
                </ThemedText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: `${theme.error}20` }]}>
                <FontAwesome6 name="palette" size={24} color={theme.error} />
              </View>
              <View style={styles.featureText}>
                <ThemedText variant="title" color={theme.textPrimary}>用非遗</ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  个性定制，专属设计
                </ThemedText>
              </View>
            </View>
          </View>
        </ThemedView>

        {/* Action Buttons */}
        <ThemedView level="root" style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/home')}
          >
            <FontAwesome6 name="rocket" size={20} color={theme.buttonPrimaryText} />
            <ThemedText variant="title" color={theme.buttonPrimaryText}>
              立即体验
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
            onPress={() => router.push('/register')}
          >
            <ThemedText variant="title" color={theme.textPrimary}>
              注册账号
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Footer */}
        <ThemedView level="root" style={styles.footer}>
          <ThemedText variant="caption" color={theme.textMuted}>
            融合传统与现代，创造独特文化价值
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </Screen>
  );
}
