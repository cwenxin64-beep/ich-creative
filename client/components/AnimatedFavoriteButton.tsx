import React, { useRef, useCallback } from 'react';
import { TouchableOpacity, Animated, Easing, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

interface AnimatedFavoriteButtonProps {
  isFavorited: boolean;
  onPress: () => void;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  style?: any;
  /** 显示文字（如"收藏"/"已收藏"），不传则只显示图标 */
  label?: string;
  labelStyle?: any;
  /** 主题对象，用于 label 颜色 */
  theme?: any;
}

export function AnimatedFavoriteButton({
  isFavorited,
  onPress,
  size = 16,
  activeColor = '#EF4444',
  inactiveColor = '#999',
  style,
  label,
  labelStyle,
  theme,
}: AnimatedFavoriteButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const animatePress = useCallback(() => {
    // 弹性缩放：1 → 1.4 → 0.9 → 1.1 → 1
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.4,
        duration: 120,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.quad),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
    ]).start();

    // 轻微抖动效果
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0.5,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 30,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, shakeAnim]);

  const handlePress = () => {
    animatePress();
    onPress();
  };

  const interpolatedShake = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-3, 0, 3], // 抖动幅度 3px
  });

  return (
    <TouchableOpacity
      style={[label ? styles.containerWithLabel : styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.6}
    >
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim },
            { translateX: interpolatedShake },
          ],
        }}
      >
        <FontAwesome6
          name="heart"
          size={size}
          solid={isFavorited}
          color={isFavorited ? activeColor : inactiveColor}
        />
      </Animated.View>
      {label ? (
        <Animated.Text
          style={[
            styles.label,
            { color: isFavorited ? activeColor : (inactiveColor) },
            labelStyle,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {label}
        </Animated.Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  containerWithLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  label: {
    fontSize: 12,
  },
});
