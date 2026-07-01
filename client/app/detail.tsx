import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatusSuccess, AVPlaybackStatus, Audio } from 'expo-av';
import { styles } from '@/components/detail.styles';
import { getApiBaseUrl } from '@/utils/api';

type DetailParams = {
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  mainImageUrl?: string;
  subImageUrl1?: string;
  subImageUrl2?: string;
  description?: string;
  title?: string;
  type?: string;
  shareId?: string;
};

export default function DetailScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const params = useSafeSearchParams<DetailParams>();

  const [videoStatus, setVideoStatus] = useState<AVPlaybackStatusSuccess | null>(null);
  const [audioSound, setAudioSound] = useState<Audio.Sound | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [remoteData, setRemoteData] = useState<DetailParams | null>(null);
  const [loadingShare, setLoadingShare] = useState(false);
  const videoRef = useRef<Video>(null);

  // 如果 URL 里带 shareId，就从后端拉数据
  useEffect(() => {
    if (!params.shareId) return;
    setLoadingShare(true);
    fetch(`${getApiBaseUrl()}/api/v1/share/${params.shareId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setRemoteData(data as DetailParams);
        }
      })
      .catch((e) => console.error('load share failed:', e))
      .finally(() => setLoadingShare(false));
  }, [params.shareId]);

  const data: DetailParams = remoteData || params;
  const screenWidth = Dimensions.get('window').width;
  const mainImageUri = data.imageUrl || data.mainImageUrl || '';
  const videoUri = data.videoUrl || '';
  const audioUri = data.audioUrl || '';
  const hasVideo = !!videoUri;
  const hasAudio = !!audioUri;

  useEffect(() => {
    return () => {
      if (audioSound) {
        audioSound.unloadAsync();
      }
    };
  }, [audioSound]);

  const handleAudioToggle = async () => {
    try {
      if (audioSound) {
        if (audioPlaying) {
          await audioSound.pauseAsync();
          setAudioPlaying(false);
        } else {
          await audioSound.playAsync();
          setAudioPlaying(true);
        }
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true }
        );
        setAudioSound(sound);
        setAudioPlaying(true);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setAudioPlaying(false);
          }
        });
      }
    } catch (e) {
      console.error('Audio play error:', e);
    }
  };

  const handleBack = () => {
    if (videoRef.current) {
      videoRef.current.stopAsync();
    }
    router.back();
  };

  const handleVideoPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setVideoStatus(status);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoStatus?.isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
    }
  };

  const isPlaying = videoStatus?.isPlaying || false;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="h3" color={theme.textPrimary}>
          详情预览
        </ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Content - Video or Image */}
        <View style={styles.mainContent}>
          {hasVideo ? (
            <View style={styles.videoContainer}>
              <Video
                ref={videoRef}
                source={{ uri: videoUri }}
                style={[styles.video, { width: screenWidth - 32 }]}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                isLooping={false}
                onPlaybackStatusUpdate={handleVideoPlaybackStatusUpdate}
              />
              {!isPlaying && (
                <TouchableOpacity
                  style={styles.playButtonOverlay}
                  onPress={handlePlayPause}
                >
                  <FontAwesome6 name="circle-play" size={64} color="rgba(255, 255, 255, 0.9)" />
                </TouchableOpacity>
              )}
            </View>
          ) : hasAudio ? (
            <View style={[styles.placeholder, { backgroundColor: theme.backgroundTertiary }]}>
              <TouchableOpacity onPress={handleAudioToggle} style={{ alignItems: 'center' }}>
                <FontAwesome6
                  name={audioPlaying ? 'circle-pause' : 'circle-play'}
                  size={80}
                  color={theme.textPrimary}
                />
                <ThemedText variant="body" color={theme.textPrimary} style={{ marginTop: 16 }}>
                  {audioPlaying ? '暂停' : '播放'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : mainImageUri ? (
            <Image
              source={{ uri: mainImageUri }}
              style={[styles.mainImage, { width: screenWidth - 32 }]}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.placeholder, { backgroundColor: theme.backgroundTertiary }]}>
              <FontAwesome6 name="image" size={48} color={theme.textMuted} />
              <ThemedText variant="body" color={theme.textMuted} style={styles.placeholderText}>
                暂无内容
              </ThemedText>
            </View>
          )}
        </View>

        {/* Sub Images */}
        {(data.subImageUrl1 || data.subImageUrl2) && (
          <View style={styles.subImagesContainer}>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.subImagesTitle}>
              作品多角度展示
            </ThemedText>
            <View style={styles.subImagesGrid}>
              {data.subImageUrl1 && (
                <View style={styles.subImageWrapper}>
                  <Image
                    source={{ uri: data.subImageUrl1 }}
                    style={styles.subImage}
                    resizeMode="cover"
                  />
                </View>
              )}
              {data.subImageUrl2 && (
                <View style={styles.subImageWrapper}>
                  <Image
                    source={{ uri: data.subImageUrl2 }}
                    style={styles.subImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Info Section */}
        <ThemedView level="root" style={styles.infoSection}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.infoTitle}>
            {data.title || '作品信息'}
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.infoText}>
            {hasVideo ? '动态视频作品' : hasAudio ? '音频作品' : '静态图片作品'}
          </ThemedText>
          {data.description && (
            <ThemedView level="default" style={styles.descriptionSection}>
              <ThemedText variant="small" color={theme.textPrimary} style={styles.descriptionLabel}>
                创意描述
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.descriptionText}>
                {data.description.length > 20 ? data.description.substring(0, 20) + '...' : data.description}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}
