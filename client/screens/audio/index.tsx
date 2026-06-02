import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, TextInput, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { getApiBaseUrl } from '@/utils';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { buildApiUrl, authFetch } from '@/utils/api';
import { FontAwesome6 } from '@expo/vector-icons';
import { GenerationProgress } from '@/components/GenerationProgress';
import SharePanel from '@/components/SharePanel';
import { AnimatedFavoriteButton } from '@/components/AnimatedFavoriteButton';
import { createStyles } from './styles';

// 快捷标签 - 曲风
const GENRE_TAGS = [
  '国风', '古风', '民谣', '中国戏曲', '传统民歌',
  '流行', '爵士', '古典', '国风电子', '国风摇滚',
];

// 快捷标签 - 情绪
const MOOD_TAGS = [
  '怀旧', '温暖', '浪漫', '梦幻', '欢乐',
  '伤感', '放松', '鼓舞', '壮丽', '抒情',
];

// 时长选项
const DURATION_OPTIONS = [
  { label: '30秒', value: 30 },
  { label: '45秒', value: 45 },
  { label: '60秒', value: 60 },
  { label: '90秒', value: 90 },
];

export default function AudioScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [sharePanelVisible, setSharePanelVisible] = useState(false);
  const [result, setResult] = useState<{
    id: number | null;
    audioUrl: string;
    captions: string;
    duration: number;
    genre: string;
    mood: string;
    taskId: string;
    storageKey?: string;
  } | null>(null);

  const toggleTag = (tag: string, selected: string[], setSelected: (v: string[]) => void) => {
    if (selected.includes(tag)) {
      setSelected(selected.filter(t => t !== tag));
    } else {
      setSelected([...selected, tag]);
    }
  };

  const handleFavorite = async () => {
    if (!result) return;

    // 如果已收藏，则取消收藏
    if (isFavorited && favoriteId) {
      try {
        const response = await authFetch(buildApiUrl(`/api/v1/favorites/${favoriteId}`), {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          setIsFavorited(false);
          setFavoriteId(null);
        } else {
          Alert.alert('取消失败', data.message || '请重试');
        }
      } catch (error) {
        console.error('Unfavorite error:', error);
        Alert.alert('错误', '取消收藏失败，请检查网络连接');
      }
      return;
    }

    try {
      const response = await authFetch(buildApiUrl('/api/v1/favorites'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'music',
          imageUrl: result.audioUrl,
          title: '唱非遗作品',
          metadata: {
            audioUrl: result.audioUrl,
            genre: result.genre,
            mood: result.mood,
            duration: result.duration,
            storageKey: result.storageKey,
            musicId: result.id,
          },
        }),
      });

      const data = await response.json();

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
    if (!result) return;
    setSharePanelVisible(true);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('提示', '请输入音乐描述');
      return;
    }

    setLoading(true);
    setProgress(0);
    setResult(null);
    setIsFavorited(false);
    setFavoriteId(null);

    // 模拟进度
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 8;
      });
    }, 2000);

    try {
      // 组合完整描述：用户输入 + 选中的标签
      const genrePart = selectedGenres.length > 0 ? `，曲风：${selectedGenres.join('、')}` : '';
      const moodPart = selectedMoods.length > 0 ? `，情绪：${selectedMoods.join('、')}` : '';
      const fullPrompt = `${prompt.trim()}${genrePart}${moodPart}，时长${selectedDuration}秒`;

      const response = await authFetch(buildApiUrl('/api/v1/audio/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          duration: selectedDuration,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProgress(100);
        setResult(data);
      } else {
        Alert.alert('生成失败', data.message || data.error || '请重试');
      }
    } catch (error) {
      console.error('Generation error:', error);
      Alert.alert('错误', '生成失败，请检查网络连接');
    } finally {
      clearInterval(progressTimer);
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
          <View style={styles.headerText}>
            <ThemedText variant="h2" color={theme.textPrimary}>
              唱非遗
            </ThemedText>
            <ThemedText variant="caption" color={theme.textSecondary}>
              描述创意，我们帮你生成非遗风格音乐
            </ThemedText>
          </View>
        </ThemedView>

        {/* 音乐描述输入 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            音乐描述
          </ThemedText>
          <TextInput
            style={[styles.textInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
            placeholder="描述你想要的音乐，例如：一首关于端午节龙舟竞渡的国风纯音乐，用古筝和琵琶演奏..."
            placeholderTextColor={theme.textMuted}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </ThemedView>

        {/* 曲风快捷标签 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            曲风
          </ThemedText>
          <View style={styles.chipContainer}>
            {GENRE_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.chip,
                  selectedGenres.includes(tag) && { backgroundColor: theme.primary, borderColor: theme.primary },
                  !selectedGenres.includes(tag) && { backgroundColor: theme.backgroundTertiary, borderColor: theme.border },
                ]}
                onPress={() => toggleTag(tag, selectedGenres, setSelectedGenres)}
              >
                <ThemedText
                  variant="caption"
                  color={selectedGenres.includes(tag) ? theme.buttonPrimaryText : theme.textSecondary}
                >
                  {tag}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* 情绪快捷标签 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            情绪
          </ThemedText>
          <View style={styles.chipContainer}>
            {MOOD_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.chip,
                  selectedMoods.includes(tag) && { backgroundColor: theme.primary, borderColor: theme.primary },
                  !selectedMoods.includes(tag) && { backgroundColor: theme.backgroundTertiary, borderColor: theme.border },
                ]}
                onPress={() => toggleTag(tag, selectedMoods, setSelectedMoods)}
              >
                <ThemedText
                  variant="caption"
                  color={selectedMoods.includes(tag) ? theme.buttonPrimaryText : theme.textSecondary}
                >
                  {tag}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* 时长选择 */}
        <ThemedView level="root" style={styles.section}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionTitle}>
            时长
          </ThemedText>
          <View style={styles.durationContainer}>
            {DURATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.durationButton,
                  selectedDuration === option.value && { backgroundColor: theme.primary, borderColor: theme.primary },
                  selectedDuration !== option.value && { backgroundColor: theme.backgroundTertiary, borderColor: theme.border },
                ]}
                onPress={() => setSelectedDuration(option.value)}
              >
                <ThemedText
                  variant="smallMedium"
                  color={selectedDuration === option.value ? theme.buttonPrimaryText : theme.textSecondary}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            { backgroundColor: theme.primary, opacity: loading || !prompt.trim() ? 0.6 : 1 },
          ]}
          onPress={handleGenerate}
          disabled={loading || !prompt.trim()}
        >
          <FontAwesome6 name="star" size={20} color={theme.buttonPrimaryText} />
          <ThemedText variant="title" color={theme.buttonPrimaryText} style={styles.generateButtonText}>
            {loading ? `生成中... ${Math.round(progress)}%` : '开始创作'}
          </ThemedText>
        </TouchableOpacity>

        {/* Loading Progress Bar */}
        {loading && (
          <GenerationProgress
            progress={progress}
            tip="我们正在为您创作音乐，通常需要 1-3 分钟..."
          />
        )}

        {/* Results */}
        {result && (
          <ThemedView level="root" style={styles.resultsSection}>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.resultsTitle}>
              生成结果
            </ThemedText>

            {/* Audio Player */}
            {result.audioUrl && (
              <ThemedView level="root" style={styles.resultCard}>
                <View style={styles.audioPlayerHeader}>
                  <FontAwesome6 name="music" size={24} color={theme.primary} />
                  <View style={styles.audioInfo}>
                    <ThemedText variant="smallMedium" color={theme.textPrimary}>
                      非遗音乐作品
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      时长: {result.duration?.toFixed(1)}s{result.genre ? ` | 曲风: ${result.genre}` : ''}
                    </ThemedText>
                  </View>
                </View>
                {/* Web 端播放器 */}
                {typeof window !== 'undefined' && 'Audio' in window && (
                  <audio
                    controls
                    src={result.audioUrl}
                    style={{ width: '100%', marginTop: 12, borderRadius: 8 }}
                  />
                )}
              </ThemedView>
            )}

            {/* Captions */}
            {result.captions && result.captions !== '{}' && (
              <ThemedView level="root" style={styles.resultCard}>
                <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.resultLabel}>
                  字幕
                </ThemedText>
                <ThemedText variant="caption" color={theme.textPrimary}>
                  {result.captions}
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
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <FontAwesome6 name="share-nodes" size={16} color={theme.textSecondary} />
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.actionButtonText}>
                  分享
                </ThemedText>
              </TouchableOpacity>
              {result.audioUrl && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={async () => {
                    if (Platform.OS === 'web') {
                      try {
                        const proxyUrl = `${getApiBaseUrl()}/api/v1/audio/proxy?url=${encodeURIComponent(result.audioUrl)}`;
                        const response = await authFetch(proxyUrl);
                        const blob = await response.blob();
                        const blobUrl = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = `非遗音乐_${Date.now()}.mp3`;
                        link.click();
                        window.URL.revokeObjectURL(blobUrl);
                      } catch (e) {
                        Alert.alert('下载失败', '请重试');
                      }
                    }
                  }}
                >
                  <FontAwesome6 name="download" size={16} color={theme.textSecondary} />
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.actionButtonText}>
                    下载
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </ThemedView>
        )}
      </ScrollView>
      <Toast message={toastMessage} visible={toastVisible} onHide={hideToast} />
      <SharePanel
        visible={sharePanelVisible}
        onClose={() => setSharePanelVisible(false)}
        audioUrl={result?.audioUrl ? `${getApiBaseUrl()}/api/v1/audio/proxy?url=${encodeURIComponent(result.audioUrl)}` : undefined}
        title="非遗风格音乐"
        description={`我创作了一首非遗风格音乐！曲风：${result?.genre || ''} 情绪：${result?.mood || ''}`}
        shareUrl={result?.audioUrl ? `${getApiBaseUrl()}/api/v1/audio/proxy?url=${encodeURIComponent(result.audioUrl)}` : undefined}
      />
    </Screen>
  );
}
