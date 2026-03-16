import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, TextInput, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useFocusEffect as useExpoFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createFormDataFile } from '@/utils';
import { buildApiUrl } from '@/utils/api';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

type OutputType = 'static' | 'dynamic';

// 轮询配置
const POLL_INTERVAL = 2000; // 2 秒轮询一次
const MAX_POLL_ATTEMPTS = 120; // 最多轮询 120 次（4 分钟）

export default function PhotoScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ photoUri?: string; fromCamera?: string }>();

  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [description, setDescription] = useState('');
  const [outputType, setOutputType] = useState<OutputType>('static');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    staticMainImageUrl: string;
    staticSubImageUrl1: string;
    staticSubImageUrl2: string;
    videoUrl: string;
    videoMainImageUrl: string;
    videoSubImageUrl1: string;
    videoSubImageUrl2: string;
    analysis: any;
  } | null>(null);

  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const handleFavorite = async () => {
    if (!result) return;

    // 如果已收藏，则取消收藏
    if (isFavorited && favoriteId) {
      try {
        /**
         * 服务端文件：server/src/routes/favorites.ts
         * 接口：DELETE /api/v1/favorites/:id
         */
        const response = await fetch(buildApiUrl(`/api/v1/favorites/${favoriteId}`), {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          setIsFavorited(false);
          setFavoriteId(null);
          Alert.alert('成功', '已取消收藏');
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
      const response = await fetch(buildApiUrl('/api/v1/favorites'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'photo',
          imageUrl: result.staticMainImageUrl,
          videoUrl: result.videoUrl,
          title: '非遗创意作品',
          metadata: {
            ...result.analysis,
            staticSubImageUrl1: result.staticSubImageUrl1,
            staticSubImageUrl2: result.staticSubImageUrl2,
            videoSubImageUrl1: result.videoSubImageUrl1,
            videoSubImageUrl2: result.videoSubImageUrl2,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsFavorited(true);
        setFavoriteId(data.id);
        Alert.alert('成功', '已添加到收藏');
      } else {
        Alert.alert('收藏失败', data.message || '请重试');
      }
    } catch (error) {
      console.error('Favorite error:', error);
      Alert.alert('错误', '收藏失败，请检查网络连接');
    }
  };

  const handleShare = async () => {
    if (!result) return;

    try {
      const url = result.staticMainImageUrl || result.videoUrl || result.videoMainImageUrl;

      if (!url) {
        Alert.alert('提示', '没有可分享的内容');
        return;
      }

      if (Platform.OS === 'web') {
        // Web 端复制链接
        await navigator.clipboard.writeText(url);
        Alert.alert('成功', '链接已复制到剪贴板');
        return;
      }

      // 移动端：下载图片并分享
      setSharing(true);

      // 生成临时文件名
      const fileExtension = url.includes('.mp4') ? 'mp4' : 'jpg';
      const fileName = `ich_art_${Date.now()}.${fileExtension}`;
      const localUri = `${(FileSystem as any).cacheDirectory}${fileName}`;

      // 下载文件到本地
      const downloadResult = await (FileSystem as any).downloadAsync(url, localUri);

      if (downloadResult.status !== 200) {
        throw new Error('下载文件失败');
      }

      // 检查是否支持分享
      const isAvailable = await Sharing.isAvailableAsync();

      if (!isAvailable) {
        Alert.alert('提示', '当前设备不支持分享功能');
        return;
      }

      // 分享文件
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: fileExtension === 'mp4' ? 'video/mp4' : 'image/jpeg',
        dialogTitle: '分享非遗创意作品',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('分享失败', '请检查网络连接后重试');
    } finally {
      setSharing(false);
    }
  };

  // 处理从相机页面返回的照片
  useExpoFocusEffect(
    React.useCallback(() => {
      if (params.photoUri && params.fromCamera === 'true') {
        setSelectedMedia({
          uri: params.photoUri,
          type: 'image',
        });
      }
    }, [params.photoUri, params.fromCamera])
  );

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限提示', '需要相册权限才能选择图片或视频');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedMedia({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
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
      Alert.alert('提示', '请先选择图片或视频');
      return;
    }

    if (!description.trim()) {
      Alert.alert('提示', '请输入创意描述');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const fileName = selectedMedia.type === 'video' ? 'video.mp4' : 'image.jpg';
      const mimeType = selectedMedia.type === 'video' ? 'video/mp4' : 'image/jpeg';
      const file = await createFormDataFile(selectedMedia.uri, fileName, mimeType);

      const formData = new FormData();
      formData.append('file', file as any);
      formData.append('description', description);
      formData.append('outputType', outputType);

      // Step 1: 发起异步生成请求
      const response = await fetch(buildApiUrl('/api/v1/photo/generate'), {
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
          const statusResponse = await fetch(buildApiUrl(`/api/v1/photo/status/${taskId}`));
          const statusData = await statusResponse.json();

          console.log('Task status:', statusData.status, 'progress:', statusData.progress);

          if (statusData.status === 'completed') {
            // 任务完成
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
          <ThemedText variant="h2" color={theme.textPrimary}>
            拍非遗
          </ThemedText>
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
                  选择图片/视频
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
              <FontAwesome6 name={selectedMedia.type === 'video' ? 'video' : 'image'} size={32} color={theme.primary} />
              <View style={styles.fileInfo}>
                <ThemedText variant="smallMedium" color={theme.textPrimary}>
                  已选择{selectedMedia.type === 'video' ? '视频' : '图片'}
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

        {/* Output Type Selection */}
        <ThemedView level="root" style={styles.inputSection}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.inputLabel}>
            生成类型
          </ThemedText>
          <View style={styles.typeButtons}>
            {(['static', 'dynamic'] as OutputType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  outputType === type && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                onPress={() => setOutputType(type)}
              >
                <FontAwesome6
                  name={type === 'static' ? 'image' : 'video'}
                  size={16}
                  color={outputType === type ? theme.buttonPrimaryText : theme.textSecondary}
                />
                <ThemedText
                  variant="small"
                  color={outputType === type ? theme.buttonPrimaryText : theme.textSecondary}
                >
                  {type === 'static' ? '图片' : '视频'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
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
            {loading ? '生成中...' : '开始创作'}
          </ThemedText>
        </TouchableOpacity>

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
                  <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={handleFavorite}
                  >
                    <FontAwesome6
                      name={isFavorited ? "heart" : "heart"}
                      size={20}
                      solid={isFavorited}
                      color={isFavorited ? "#EF4444" : theme.textSecondary}
                    />
                  </TouchableOpacity>
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
                      <Image source={{ uri: result.staticSubImageUrl1 }} style={styles.resultSubImage} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/detail', { imageUrl: result.staticSubImageUrl2 })}>
                      <Image source={{ uri: result.staticSubImageUrl2 }} style={styles.resultSubImage} />
                    </TouchableOpacity>
                  </View>
                </View>
              </ThemedView>
            )}

            {/* Video Result */}
            {outputType === 'dynamic' && result.videoUrl && (
              <ThemedView level="root" style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.resultLabel}>
                    动态视频
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={handleFavorite}
                  >
                    <FontAwesome6
                      name={isFavorited ? "heart" : "heart"}
                      size={20}
                      solid={isFavorited}
                      color={isFavorited ? "#EF4444" : theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.resultImagesContainer}>
                  <TouchableOpacity
                    onPress={() => router.push('/detail', {
                      videoUrl: result.videoUrl,
                      mainImageUrl: result.videoMainImageUrl,
                      subImageUrl1: result.videoSubImageUrl1,
                      subImageUrl2: result.videoSubImageUrl2,
                      description: result.analysis?.creativeDescription || description,
                    })}
                  >
                    <View style={styles.videoPreview}>
                      <Image source={{ uri: result.videoMainImageUrl }} style={styles.videoThumbnail} />
                      <FontAwesome6 name="circle-play" size={48} color="#fff" style={styles.playIcon} />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.resultSubImages}>
                    <TouchableOpacity onPress={() => router.push('/detail', { imageUrl: result.videoSubImageUrl1 })}>
                      <Image source={{ uri: result.videoSubImageUrl1 }} style={styles.resultSubImage} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/detail', { imageUrl: result.videoSubImageUrl2 })}>
                      <Image source={{ uri: result.videoSubImageUrl2 }} style={styles.resultSubImage} />
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
    </Screen>
  );
}
