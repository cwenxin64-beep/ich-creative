import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatusSuccess, AVPlaybackStatus } from 'expo-av';
import { styles } from './detail.styles';

type DetailParams = {
  imageUrl?: string;
  videoUrl?: string;
  mainImageUrl?: string;
  subImageUrl1?: string;
  subImageUrl2?: string;
  description?: string;
};

export default function DetailScreen() {
  const { theme, isDark } = useTheme();
  const router = useSafeRouter();
  const params = useSafeSearchParams<DetailParams>();

  const [videoStatus, setVideoStatus] = useState<AVPlaybackStatusSuccess | null>(null);
  const videoRef = useRef<Video>(null);

  const screenWidth = Dimensions.get('window').width;
  const mainImageUri = params.imageUrl || params.mainImageUrl || '';
  const videoUri = params.videoUrl || '';
  const hasVideo = !!videoUri;

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
        {(params.subImageUrl1 || params.subImageUrl2) && (
          <View style={styles.subImagesContainer}>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.subImagesTitle}>
              作品多角度展示
            </ThemedText>
            <View style={styles.subImagesGrid}>
              {params.subImageUrl1 && (
                <View style={styles.subImageWrapper}>
                  <Image
                    source={{ uri: params.subImageUrl1 }}
                    style={styles.subImage}
                    resizeMode="cover"
                  />
                </View>
              )}
              {params.subImageUrl2 && (
                <View style={styles.subImageWrapper}>
                  <Image
                    source={{ uri: params.subImageUrl2 }}
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
            作品信息
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.infoText}>
            {hasVideo ? '动态视频作品' : '静态图片作品'}
          </ThemedText>
          {params.description && (
            <ThemedView level="default" style={styles.descriptionSection}>
              <ThemedText variant="small" color={theme.textPrimary} style={styles.descriptionLabel}>
                创意描述
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.descriptionText}>
                {params.description.length > 20 ? params.description.substring(0, 20) + '...' : params.description}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}
