import React, { useState, useMemo, useRef } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, TextInput, Platform, Image, Share as RNShare } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createFormDataFile } from '@/utils';
import { buildApiUrl } from '@/utils/api';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

export default function AudioScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [selectedAudio, setSelectedAudio] = useState<{ uri: string; name: string } | null>(null);
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    mainImageUrl: string;
    subImageUrl1: string;
    subImageUrl2: string;
    transcription: string;
    analysis: any;
  } | null>(null);

  // 录音相关状态
  const recordingRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const handleFavorite = async () => {
    if (!result) return;

    try {
      /**
       * 服务端文件：server/src/routes/favorites.ts
       * 接口：POST /api/v1/favorites
       * Body 参数：type: string, imageUrl?: string, title: string, metadata?: any
       */
      const response = await fetch(buildApiUrl('/api/v1/favorites'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'audio',
          imageUrl: result.mainImageUrl,
          title: '说非遗作品',
          metadata: {
            transcription: result.transcription,
            analysis: result.analysis,
            subImageUrl1: result.subImageUrl1,
            subImageUrl2: result.subImageUrl2,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
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
      if (Platform.OS !== 'web') {
        const message = `我创造了一个说非遗作品：\n${result.transcription}`;

        await RNShare.share({
          message,
          url: result.mainImageUrl,
        });
      } else {
        // Web 端复制链接
        if (result.mainImageUrl) {
          await navigator.clipboard.writeText(result.mainImageUrl);
          Alert.alert('成功', '链接已复制到剪贴板');
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('分享失败', '请重试');
    }
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedAudio({
          uri: result.assets[0].uri,
          name: result.assets[0].name,
        });
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      Alert.alert('错误', '选择音频失败');
    }
  };

  // 请求录音权限
  const requestAudioPermission = async () => {
    try {
      const { status } = await (Audio as any).requestPermissionsAsync();
      setHasPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting audio permission:', error);
      Alert.alert('错误', '无法获取麦克风权限');
      return false;
    }
  };

  // 开始录音
  const startRecording = async () => {
    try {
      // 请求权限
      const granted = await requestAudioPermission();
      if (!granted) {
        Alert.alert('权限提示', '需要麦克风权限才能录音');
        return;
      }

      // 设置音频模式
      await (Audio as any).setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 创建录音对象
      const { recording } = await (Audio.Recording as any).createAsync(
        (Audio.RecordingOptionsPresets as any).HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('错误', '录音失败');
    }
  };

  // 停止录音
  const stopRecording = async () => {
    if (!recordingRef.current) {
      return;
    }

    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();

      const uri = recordingRef.current.getURI();
      if (uri) {
        setSelectedAudio({
          uri,
          name: `recording_${Date.now()}.m4a`,
        });
      }

      recordingRef.current = null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('错误', '停止录音失败');
    }
  };

  // 切换录音状态
  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleGenerate = async () => {
    if (!selectedAudio) {
      Alert.alert('提示', '请先选择音频文件');
      return;
    }

    setLoading(true);

    try {
      const file = await createFormDataFile(selectedAudio.uri, selectedAudio.name, 'audio/mpeg');

      const formData = new FormData();
      formData.append('file', file as any);
      formData.append('keywords', keywords);

      /**
       * 服务端文件：server/src/routes/audio.ts
       * 接口：POST /api/v1/audio/generate
       * Body 参数：file: File, keywords: string
       */
      const response = await fetch(buildApiUrl('/api/v1/audio/generate'), {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        Alert.alert('生成失败', data.message || '请重试');
      }
    } catch (error) {
      console.error('Generation error:', error);
      Alert.alert('错误', '生成失败，请检查网络连接');
    } finally {
      setLoading(false);
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
            说非遗
          </ThemedText>
        </ThemedView>

        {/* Upload Area */}
        <ThemedView level="root" style={styles.uploadSection}>
          {!selectedAudio ? (
            <View style={styles.uploadButtons}>
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: theme.backgroundDefault }]}
                onPress={pickAudio}
              >
                <FontAwesome6 name="music" size={32} color={theme.primary} />
                <ThemedText variant="body" color={theme.textPrimary} style={styles.uploadButtonText}>
                  选择音频
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  支持文件上传
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  {
                    backgroundColor: isRecording
                      ? `${theme.primary}20`
                      : theme.backgroundDefault,
                    borderColor: isRecording
                      ? theme.primary
                      : theme.border,
                    borderWidth: isRecording ? 2 : 1,
                  },
                ]}
                onPress={toggleRecording}
              >
                <FontAwesome6
                  name={isRecording ? "microphone-slash" : "microphone"}
                  size={32}
                  color={isRecording ? theme.primary : theme.primary}
                />
                <ThemedText
                  variant="body"
                  color={isRecording ? theme.primary : theme.textPrimary}
                  style={styles.uploadButtonText}
                >
                  {isRecording ? "停止录音" : "开始录音"}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  {isRecording ? "点击停止" : "点击说话"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.previewContainer}>
              <FontAwesome6 name="file-audio" size={32} color={theme.primary} />
              <View style={styles.fileInfo}>
                <ThemedText variant="smallMedium" color={theme.textPrimary}>
                  {selectedAudio.name}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  已选择音频
                </ThemedText>
              </View>
              <TouchableOpacity onPress={() => setSelectedAudio(null)}>
                <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        </ThemedView>

        {/* Keywords Input */}
        <ThemedView level="root" style={styles.inputSection}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.inputLabel}>
            创意关键词
          </ThemedText>
          <TextInput
            style={[styles.textInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
            placeholder="输入关键词，例如：喜庆、传统、现代..."
            placeholderTextColor={theme.textMuted}
            value={keywords}
            onChangeText={setKeywords}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </ThemedView>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            { backgroundColor: theme.primary, opacity: loading || !selectedAudio ? 0.6 : 1 },
          ]}
          onPress={handleGenerate}
          disabled={loading || !selectedAudio}
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

            <ThemedView level="root" style={styles.resultCard}>
              <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.resultLabel}>
                识别文本
              </ThemedText>
              <ThemedText variant="body" color={theme.textPrimary}>
                {result.transcription || '无识别结果'}
              </ThemedText>
            </ThemedView>

            <ThemedView level="root" style={styles.resultCard}>
              <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.resultLabel}>
                情感分析
              </ThemedText>
              <ThemedText variant="caption" color={theme.textPrimary}>
                {result.analysis?.emotion || '无'}
              </ThemedText>
            </ThemedView>

            {result.mainImageUrl && (
              <TouchableOpacity onPress={() => router.push('/detail', {
                imageUrl: result.mainImageUrl,
                subImageUrl1: result.subImageUrl1,
                subImageUrl2: result.subImageUrl2,
              })}>
                <Image source={{ uri: result.mainImageUrl }} style={styles.resultImage} />
                <View style={styles.resultSubImages}>
                  <TouchableOpacity onPress={() => router.push('/detail', { imageUrl: result.subImageUrl1 })}>
                    <Image source={{ uri: result.subImageUrl1 }} style={styles.resultSubImage} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/detail', { imageUrl: result.subImageUrl2 })}>
                    <Image source={{ uri: result.subImageUrl2 }} style={styles.resultSubImage} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}

            {/* Action Buttons */}
            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleFavorite}
              >
                <FontAwesome6 name="heart" size={16} color={theme.textSecondary} />
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.actionButtonText}>
                  收藏
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShare}
              >
                <FontAwesome6 name="share-nodes" size={16} color={theme.textSecondary} />
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.actionButtonText}>
                  分享
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}
      </ScrollView>
    </Screen>
  );
}
