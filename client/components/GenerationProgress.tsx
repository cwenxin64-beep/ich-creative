import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing } from '../constants/Theme';

interface GenerationProgressProps {
  progress: number;
  tip?: string;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  progress,
  tip = 'AI 正在为你创作，请稍候...',
}) => {
  const theme = useTheme();
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
  if (progress < 30) return '正在构思非遗风格方案...';
  if (progress < 50) return '正在融合非遗元素...';
  if (progress < 70) return '正在生成作品中...';
  if (progress < 90) return '正在精修细节...';
  if (progress < 100) return '即将完成...';
  return '创作完成!';
}
