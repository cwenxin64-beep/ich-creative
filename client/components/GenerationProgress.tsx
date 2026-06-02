import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';

interface GenerationProgressProps {
  progress: number;
  tip?: string;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  progress,
  tip = '我们正在为您创作，请稍候...',
}) => {
  const { theme } = useTheme();
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // 脉冲动画：进度条填充区域微微闪烁
  useEffect(() => {
    if (progress < 100) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [progress]);

  return (
    <View style={{ marginBottom: Spacing.xl }}>
      {/* 进度条 */}
      <View
        style={{
          height: 6,
          borderRadius: 3,
          overflow: 'hidden',
          backgroundColor: theme.backgroundTertiary,
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            borderRadius: 3,
            width: animatedWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
            backgroundColor: theme.primary,
            opacity: pulseAnim,
          }}
        />
      </View>

      {/* 步骤提示 */}
      <View style={{ marginTop: Spacing.sm, alignItems: 'center' }}>
        <ThemedText variant="caption" color={theme.textMuted} style={{ textAlign: 'center' }}>
          {getStepText(progress)}
        </ThemedText>
        {tip ? (
          <ThemedText
            variant="caption"
            color={theme.textMuted}
            style={{ textAlign: 'center', marginTop: 4, opacity: 0.7 }}
          >
            {tip}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
};

function getStepText(progress: number): string {
  if (progress < 15) return '正在理解你的创意...';
  if (progress < 30) return '构思非遗风格方案...';
  if (progress < 50) return '融合传统与现代元素...';
  if (progress < 70) return '生成创作中...';
  if (progress < 85) return '精修细节...';
  if (progress < 100) return '即将完成...';
  return '创作完成!';
}
