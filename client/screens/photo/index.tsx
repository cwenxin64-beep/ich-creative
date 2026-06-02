import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, TextInput, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { GenerationProgress } from '../../components/GenerationProgress';
import SharePanel from '../../components/SharePanel';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useFocusEffect as useExpoFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createFormDataFile } from '@/utils';
import { buildApiUrl, authFetch } from '@/utils/api';
import { FontAwesome6 } from '@expo/vector-icons';
import { AnimatedFavoriteButton } from '@/components/AnimatedFavoriteButton';
import { createStyles } from './styles';

// 轮询配置
const POLL_INTERVAL = 2000; // 2 秒轮询一次
const MAX_POLL_ATTEMPTS = 120; // 最多轮询 120 次（4 分钟）

export default function PhotoScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ photoUri?: string; fromCamera?: string }>();

  const [selectedMedia, setSelectedMedia] = useState<{ uri: string } | null>(null);
  const [description, setDescription] = useState('');
  const outputType = 'static' as const;
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    staticMainImageUrl?: string;
    staticSubImageUrl1?: string;
    staticSubImageUrl2?: string;
    analysis?: any;
  } | null>(null);

  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [sharePanelVisible, setSharePanelVisible] = useState(false);

  const handleFavorite = async () => {
    console.log('[Favorite] Button pressed, result:', result);
    
    if (!result) {
      Alert.alert('提示', '请先生成作品');
      return;
    }

    // 如果已收藏，则取消收藏
    if (isFavorited && favoriteId) {
      try {
        /**
         * 服务端文件：server/src/routes/favorites.ts
         * 接口：DELETE /api/v1/favorites/:id
         */
        const response = await authFetch(buildApiUrl(`/api/v1/favorites/${favoriteId}`), {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          setIsFavorited(false);
          setFavoriteId(null);
        } else {
          Alert.alert('取消收藏失败', data.message || '请重试');
        }
      } catch (error) {
        console.error('Remove favorite error:', error);
        Alert.alert('错误', '取消收藏失败，请检查网络连接');
      }
      return;
    }

    // 如果未收藏，则添加收藏
    try {
      /**
       * 服务端文件：server/src/routes/favorites.ts
       * 接口：POST /api/v1/favorites
       * Body 参数：type: string, imageUrl?: string, videoUrl?: string, title: string, metadata?: any
       */
      const imageUrl = result.staticMainImageUrl;
      
      if (!imageUrl) {
        console.log('[Favorite] No image URL available, result keys:', Object.keys(result));
        Alert.alert('提示', '没有可收藏的内容');
        return;
      }

      console.log('[Favorite] Sending request with imageUrl:', imageUrl);
      const response = await authFetch(buildApiUrl('/api/v1/favorites'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'photo',
          imageUrl,
          title: '非遗创意作品',
          metadata: {
            ...result.analysis,
            staticSubImageUrl1: result.staticSubImageUrl1,
            staticSubImageUrl2: result.staticSubImageUrl2,
          },
        }),
      });

      console.log('[Favorite] Response status:', response.status);
      const data = await response.json();
      console.log('[Favorite] Response data:', data);

      if (data.success) {
        setIsFavorited(true);
        setFavoriteId(data.id);
      } else {
        Alert.alert('收藏失败', data.message || '请重试');
      }
    } catch (error) {
      console.error('Favorite error:', error);
      Alert.alert('错误', '收藏失败，请检查网络连接');
    }
  };

  const handleShare = async () => {
    console.log('[Share] Button pressed, result:', result);
    
    if (!result) {
      Alert.alert('提示', '请先生成作品');
      return;
    }

    setSharePanelVisible(true);
  };

  // 处理从相机页面返回的照片
  useExpoFocusEffect(
    React.useCallback(() => {
      if (params.photoUri && params.fromCamera === 'true') {
        setSelectedMedia({
          uri: params.photoUri,
        });
      }
    }, [params.photoUri, params.fromCamera])
  );

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限提示', '需要相册权限才能选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedMedia({
          uri: asset.uri,
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('错误', '选择图片失败');
    }
  };

  const takePhoto = () => {
    router.push('/camera');
  };

  const handleGenerate = async () => {
    if (!selectedMedia) {
      Alert.alert('提示', '请先选择图片');
      return;
    }

    if (!description.trim()) {
      Alert.alert('提示', '请输入创意描述');
      return;
    }

    setLoading(true);
    setProgress(0);
    setResult(null);

    // 模拟进度
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 8;
      });
    }, 2000);

    try {
      const fileName = 'image.jpg';
      const mimeType = 'image/jpeg';
      const file = await createFormDataFile(selectedMedia.uri, fileName, mimeType);

      const formData = new FormData();
      formData.append('file', file as any);
      formData.append('description', description);
      formData.append('outputType', outputType);

      // Step 1: 发起异步生成请求
      const response = await authFetch(buildApiUrl('/api/v1/photo/generate'), {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.taskId) {
        Alert.alert('生成失败', data.message || data.error || '请重试');
        setLoading(false);
        return;
      }

      const taskId = data.taskId;
      console.log('Task created:', taskId);

      // Step 2: 轮询查询任务状态
      let attempts = 0;
      const pollStatus = async (): Promise<void> => {
        try {
          const statusResponse = await authFetch(buildApiUrl(`/api/v1/photo/status/${taskId}`));
          const statusData = await statusResponse.json();

          console.log('Task status:', statusData.status, 'progress:', statusData.progress);

          if (statusData.status === 'completed') {
            // 任务完成
            setProgress(100);
            setLoading(false);
            if (statusData.result) {
              setResult(statusData.result);
            } else {
              Alert.alert('生成失败', '结果为空');
            }
          } else if (statusData.status === 'failed') {
            // 任务失败
            setLoading(false);
            Alert.alert('生成失败', statusData.error || '请重试');
          } else if (attempts < MAX_POLL_ATTEMPTS) {
            // 继续轮询
            attempts++;
            setTimeout(pollStatus, POLL_INTERVAL);
          } else {
            // 超过最大轮询次数
            setLoading(false);
            Alert.alert('超时', '生成时间过长，请稍后重试');
          }
        } catch (error) {
          console.error('Poll error:', error);
          if (attempts < MAX_POLL_ATTEMPTS) {
            attempts++;
            setTimeout(pollStatus, POLL_INTERVAL);
          } else {
            setLoading(false);
            Alert.alert('错误', '查询状态失败');
          }
        }
      };

      // 开始轮询
      setTimeout(pollStatus, POLL_INTERVAL);
    } catch (error) {
      console.error('Generation error:', error);
      setLoading(false);
      Alert.alert('错误', '生成失败，请检查网络连接');
    } finally {
      clearInterval(progressTimer);
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <ThemedText variant="h2" color={theme.textPrimary}>
              拍非遗
            </ThemedText>
            <ThemedText variant="caption" color={theme.textSecondary}>
              上传照片，我们帮你生成非遗风格创意图片
            </ThemedText>
          </View>
        </ThemedView>

        {/* Upload Area */}
        <ThemedView level="root" style={styles.uploadSection}>
          {!selectedMedia ? (
            <View style={styles.uploadButtons}>
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: theme.backgroundDefault }]}
                onPress={pickImage}
              >
                <FontAwesome6 name="images" size={32} color={theme.primary} />
                <ThemedText variant="body" color={theme.textPrimary} style={styles.uploadButtonText}>
                  选择图片
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: theme.backgroundDefault }]}
                onPress={takePhoto}
              >
                <FontAwesome6 name="camera" size={32} color={theme.primary} />
                <ThemedText variant="body" color={theme.textPrimary} style={styles.uploadButtonText}>
                  拍照
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.previewContainer}>
              <FontAwesome6 name="image" size={32} color={theme.primary} />
              <View style={styles.fileInfo}>
                <ThemedText variant="smallMedium" color={theme.textPrimary}>
                  已选择图片
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  点击下方按钮可重新选择
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.reselectButton}
                onPress={() => setSelectedMedia(null)}
              >
                <FontAwesome6 name="rotate" size={16} color={theme.textSecondary} />
                <ThemedText variant="small" color={theme.textSecondary} style={styles.reselectText}>
                  重新选择
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ThemedView>

        {/* Description Input */}
        <ThemedView level="root" style={styles.inputSection}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.inputLabel}>
            创意描述
          </ThemedText>
          <TextInput
            style={[styles.textInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
            placeholder="描述你想要的创意方向，例如：将剪纸元素融入现代手机壳设计..."
            placeholderTextColor={theme.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </ThemedView>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            { backgroundColor: theme.primary, opacity: loading || !selectedMedia || !description.trim() ? 0.6 : 1 },
          ]}
          onPress={handleGenerate}
          disabled={loading || !selectedMedia || !description.trim()}
        >
          <FontAwesome6 name="star" size={20} color={theme.buttonPrimaryText} />
          <ThemedText variant="title" color={theme.buttonPrimaryText} style={styles.generateButtonText}>
            {loading ? `生成中... ${Math.round(progress)}%` : '开始创作'}
          </ThemedText>
        </TouchableOpacity>

        {/* Progress Bar */}
        {loading && (
          <GenerationProgress
            progress={progress}
            tip="我们正在为您生成非遗风格图片，通常需要 30-60 秒..."
          />
        )}

        {/* Results */}
        {result && (
          <ThemedView level="root" style={styles.resultsSection}>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.resultsTitle}>
              生成结果
            </ThemedText>

            {/* Static Image Result */}
            {outputType === 'static' && result.staticMainImageUrl && (
              <ThemedView level="root" style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.resultLabel}>
                    静态图片
                  </ThemedText>
                </View>
                <View style={styles.resultImagesContainer}>
                  <TouchableOpacity
                    onPress={() => router.push('/detail', {
                      imageUrl: result.staticMainImageUrl,
                      subImageUrl1: result.staticSubImageUrl1,
                      subImageUrl2: result.staticSubImageUrl2,
                      description: result.analysis?.creativeDescription || description,
                    })}
                  >
                    <Image source={{ uri: result.staticMainImageUrl }} style={styles.resultImage} />
                  </TouchableOpacity>
                  <View style={styles.resultSubImages}>
                    <TouchableOpacity onPress={() => router.push('/detail', { imageUrl: result.staticSubImageUrl1 })}>
                      <Image source={{ uri: result.staticSubImageUrl1 } as any} style={styles.resultSubImage} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/detail', { imageUrl: result.staticSubImageUrl2 })}>
                      <Image source={{ uri: result.staticSubImageUrl2 } as any} style={styles.resultSubImage} />
                    </TouchableOpacity>
                  </View>
                </View>
              </ThemedView>
            )}

            {/* Analysis Result */}
            {result.analysis && (
              <ThemedView level="root" style={styles.analysisCard}>
                <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.resultLabel}>
                  作品介绍
                </ThemedText>
                <ThemedText variant="caption" color={theme.textPrimary}>
                  元素: {result.analysis?.ichElements?.join(', ') || '无'}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  情感: {result.analysis?.emotionalTone || '无'}
                </ThemedText>
              </ThemedView>
            )}

            {/* Action Buttons */}
            <View style={styles.resultActions}>
              <AnimatedFavoriteButton
                isFavorited={isFavorited}
                onPress={handleFavorite}
                size={16}
                activeColor="#EF4444"
                inactiveColor={theme.textSecondary}
                label={isFavorited ? '已收藏' : '收藏'}
                labelStyle={styles.actionButtonText}
              />
              <TouchableOpacity
                style={[styles.actionButton, sharing && { opacity: 0.5 }]}
                onPress={handleShare}
                disabled={sharing}
              >
                <FontAwesome6 name="share-nodes" size={16} color={theme.textSecondary} />
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.actionButtonText}>
                  {sharing ? '分享中...' : '分享'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}

      </ScrollView>
      <Toast message={toastMessage} visible={toastVisible} onHide={hideToast} />
      <SharePanel
        visible={sharePanelVisible}
        onClose={() => setSharePanelVisible(false)}
        imageUrl={result?.staticMainImageUrl}
        title="非遗创意作品"
        description="我用智能非遗创作了一幅非遗风格作品，快来看看！"
        shareUrl={result?.staticMainImageUrl}
      />
    </Screen>
  );
}
