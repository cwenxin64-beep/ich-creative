import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

// 只在 web 平台以外的地方引入 expo-camera，避免 web 上出现权限相关的兼容问题
const isWeb = Platform.OS === 'web';

// 动态引入，避免 web 上加载 expo-camera 时的报错或权限问题
let CameraView: any = null;
let useCameraPermissions: any = null;
if (!isWeb) {
  try {
    const cam = require('expo-camera');
    CameraView = cam.CameraView;
    useCameraPermissions = cam.useCameraPermissions;
  } catch (e) {
    console.warn('expo-camera not available', e);
  }
}

export default function CameraScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  // Web 平台：使用原生 input file
  if (isWeb) {
    return <WebCameraScreen theme={theme} isDark={isDark} styles={styles} router={router} />;
  }

  return <NativeCameraScreen theme={theme} isDark={isDark} styles={styles} router={router} />;
}

// ======= Web 版：用 input type="file" 直接调起相机/相册 =======
function WebCameraScreen({ theme, isDark, styles, router }: any) {
  const fileInputCameraRef = useRef<HTMLInputElement | null>(null);
  const fileInputAlbumRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // 页面挂载时自动触发系统相机（移动端 Safari/Chrome 会弹出选择：拍照/相册）
    // 不自动触发，让用户主动点击，避免被浏览器拦截
  }, []);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    // 转成 blob URL 传回上一页
    const objectUrl = URL.createObjectURL(file);
    // 用 sessionStorage 缓存 photoUri，避免 URL 参数过长
    try {
      sessionStorage.setItem('cameraPhotoUri', objectUrl);
    } catch {}
    router.back();
    setTimeout(() => {
      router.push('/photo', {
        photoUri: objectUrl,
        fromCamera: 'true',
      });
    }, 100);
  };

  const openCamera = () => {
    fileInputCameraRef.current?.click();
  };

  const openAlbum = () => {
    fileInputAlbumRef.current?.click();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        <View style={[styles.container, { justifyContent: 'center', paddingHorizontal: 32 }]}>
          <FontAwesome6 name="camera" size={64} color={theme.primary} style={{ alignSelf: 'center', marginBottom: 24 }} />
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.message}>
            拍摄或选择照片
          </ThemedText>
          <ThemedText variant="body" color={theme.textMuted} style={{ textAlign: 'center', marginBottom: 32 }}>
            {'点击下方按钮拍照，或从相册选择一张照片'}
          </ThemedText>

          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: theme.primary, marginBottom: 16 }]}
            onPress={openCamera}
          >
            <ThemedText variant="title" color={theme.buttonPrimaryText}>
              📷 拍照
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: theme.primary }]}
            onPress={openAlbum}
          >
            <ThemedText variant="title" color={theme.buttonPrimaryText}>
              🖼️ 从相册选择
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 24, alignItems: 'center' }}
            onPress={handleCancel}
          >
            <ThemedText variant="body" color={theme.textMuted}>
              取消
            </ThemedText>
          </TouchableOpacity>

          {/* 隐藏 input：拍照（capture=environment 表示后置摄像头） */}
          <input
            ref={fileInputCameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />
          {/* 隐藏 input：相册（不带 capture 属性） */}
          <input
            ref={fileInputAlbumRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />
        </View>
      </View>
    </Screen>
  );
}

// ======= 原生版：使用 expo-camera =======
function NativeCameraScreen({ theme, isDark, styles, router }: any) {
  const [permission, requestPermission] = useCameraPermissions ? useCameraPermissions() : [null, () => {}];
  const [facing, setFacing] = useState<'back' | 'front'>('back');
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
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
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
        router.back();
        setTimeout(() => {
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
        <View style={styles.cameraContainer}>
          {CameraView && (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              onCameraReady={() => setReady(true)}
            />
          )}
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.controlButton} onPress={handleCancel}>
            <FontAwesome6 name="xmark" size={24} color={theme.textPrimary} />
            <ThemedText variant="small" color={theme.textPrimary} style={styles.controlText}>
              取消
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureButton, { borderColor: theme.primary }]}
            onPress={takePicture}
            disabled={!ready}
          >
            <View style={[styles.captureInner, { backgroundColor: ready ? theme.primary : theme.textMuted }]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
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
