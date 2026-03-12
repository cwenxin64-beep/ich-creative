import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

export default function CameraScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [ready, setReady] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.container}>
          <ThemedText variant="body" color={theme.textPrimary}>请求相机权限中...</ThemedText>
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.container}>
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.message}>
            需要相机权限才能拍照
          </ThemedText>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: theme.primary }]}
            onPress={requestPermission}
          >
            <ThemedText variant="title" color={theme.buttonPrimaryText}>
              授予权限
            </ThemedText>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (!cameraRef.current) {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo && photo.uri) {
        // 返回到拍非遗页面，传递照片 URI
        router.back();
        // 使用 setTimeout 确保路由导航完成后再更新
        setTimeout(() => {
          // 通过事件或其他方式通知父页面
          // 这里我们使用路由参数传递
          router.push('/photo', {
            photoUri: photo.uri,
            fromCamera: 'true',
          });
        }, 100);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('错误', '拍照失败');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* Camera View */}
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            onCameraReady={() => setReady(true)}
          />
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleCancel}
          >
            <FontAwesome6 name="xmark" size={24} color={theme.textPrimary} />
            <ThemedText variant="small" color={theme.textPrimary} style={styles.controlText}>
              取消
            </ThemedText>
          </TouchableOpacity>

          {/* Capture Button */}
          <TouchableOpacity
            style={[styles.captureButton, { borderColor: theme.primary }]}
            onPress={takePicture}
            disabled={!ready}
          >
            <View style={[styles.captureInner, { backgroundColor: ready ? theme.primary : theme.textMuted }]} />
          </TouchableOpacity>

          {/* Flip Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleCameraFacing}
          >
            <FontAwesome6 name="rotate" size={24} color={theme.textPrimary} />
            <ThemedText variant="small" color={theme.textPrimary} style={styles.controlText}>
              翻转
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}
