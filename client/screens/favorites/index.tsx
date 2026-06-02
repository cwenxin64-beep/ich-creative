import React, { useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Share, Alert, TouchableOpacity, Modal, Dimensions, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Image } from 'expo-image';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { buildApiUrl, authFetch } from '@/utils/api';
import { createStyles } from './styles';

interface FavoriteItem {
  id: string;
  type: string;
  title: string;
  description: string;
  mainImageUrl: string;
  subImageUrls?: string[];
  createdAt: string;
  metadata?: {
    audioUrl?: string;
    genre?: string;
    mood?: string;
    duration?: number;
    storageKey?: string;
    musicId?: number;
    creativeDescription?: string;
    subImageUrl1?: string;
    subImageUrl2?: string;
    staticSubImageUrl1?: string;
    staticSubImageUrl2?: string;
    [key: string]: any;
  };
}

export default function FavoritesScreen() {
  const router = useSafeRouter();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [detailItem, setDetailItem] = useState<FavoriteItem | null>(null);

  const fetchFavorites = async () => {
    try {
      const response = await authFetch(buildApiUrl('/api/v1/favorites'));
      if (response.ok) {
        const data = await response.json();
        const mappedFavorites = (data.favorites || []).map((fav: any) => {
          const metadata = fav.metadata || {};
          const isMusic = fav.type === 'music';
          return {
            id: String(fav.id),
            type: fav.type || 'photo',
            title: fav.title || '非遗创意作品',
            description: metadata.creativeDescription || (isMusic ? `${metadata.genre || ''} ${metadata.mood || ''}`.trim() : ''),
            mainImageUrl: isMusic ? '' : (fav.imageUrl || ''),
            subImageUrls: isMusic ? [] : [
              metadata.subImageUrl1 || '',
              metadata.subImageUrl2 || '',
              metadata.staticSubImageUrl1 || '',
              metadata.staticSubImageUrl2 || '',
            ].filter(Boolean),
            createdAt: fav.createdAt || fav.created_at || new Date().toISOString(),
            metadata,
          };
        });
        setFavorites(mappedFavorites);
        setSelectedIds(new Set());
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchFavorites();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  const handleSelectToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === favorites.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(favorites.map(f => f.id)));
    }
  };

  const handleShare = async (item: FavoriteItem) => {
    try {
      const isMusic = item.type === 'music';
      const message = isMusic
        ? `${item.title}\n曲风：${item.metadata?.genre || ''} | 情绪：${item.metadata?.mood || ''}\n\n由智能非遗创意平台创作`
        : `${item.title}\n${item.description}\n\n查看更多精彩作品！`;
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(message);
        showToast('内容已复制到剪贴板');
      } else {
        await Share.share({ message });
        showToast('分享成功');
      }
    } catch (error) {
      showToast('分享失败，请稍后重试');
    }
  };

  const handleBatchShare = async () => {
    if (selectedIds.size === 0) return;
    const items = favorites.filter(f => selectedIds.has(f.id));
    try {
      const message = items.map(item => `${item.title}: ${item.description}`).join('\n\n');
      await Share.share({ message: `${message}\n\n查看更多精彩作品！` });
    } catch (error) {
      Alert.alert('提示', '分享失败，请稍后重试');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个收藏吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                buildApiUrl(`/api/v1/favorites/${id}`),
                { method: 'DELETE' }
              );
              if (response.ok) {
                setFavorites(favorites.filter(f => f.id !== id));
                if (detailItem?.id === id) setDetailItem(null);
                Alert.alert('成功', '收藏已删除');
              }
            } catch (error) {
              Alert.alert('错误', '删除失败，请稍后重试');
            }
          },
        },
      ]
    );
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      '确认批量删除',
      `确定要删除选中的 ${selectedIds.size} 个收藏吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = Array.from(selectedIds).map(id =>
                authFetch(buildApiUrl(`/api/v1/favorites/${id}`), { method: 'DELETE' })
              );
              await Promise.all(deletePromises);
              setFavorites(favorites.filter(f => !selectedIds.has(f.id)));
              setSelectedIds(new Set());
              Alert.alert('成功', '批量删除成功');
            } catch (error) {
              Alert.alert('错误', '删除失败，请稍后重试');
            }
          },
        },
      ]
    );
  };

  const handleSyncToMaterials = async () => {
    try {
      const response = await authFetch(buildApiUrl('/api/v1/materials/sync'), {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        showToast(data.message || '同步成功');
      } else {
        showToast('同步失败，请稍后重试');
      }
    } catch (error) {
      console.error('Sync to materials error:', error);
      showToast('同步失败，请稍后重试');
    }
  };

  const handleClearAll = async () => {
    if (favorites.length === 0) return;
    Alert.alert(
      '确认清空',
      '确定要清空所有收藏吗？此操作不可恢复。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清空',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = favorites.map(f =>
                authFetch(buildApiUrl(`/api/v1/favorites/${f.id}`), { method: 'DELETE' })
              );
              await Promise.all(deletePromises);
              setFavorites([]);
              setSelectedIds(new Set());
              setDetailItem(null);
              Alert.alert('成功', '已清空所有收藏');
            } catch (error) {
              Alert.alert('错误', '清空失败，请稍后重试');
            }
          },
        },
      ]
    );
  };

  const isMusic = (item: FavoriteItem) => item.type === 'music';

  const renderMusicCard = (item: FavoriteItem) => (
    <ThemedView key={item.id} level="default" style={styles.card}>
      {/* 选中标记 */}
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => handleSelectToggle(item.id)}
      >
        <FontAwesome6
          name={selectedIds.has(item.id) ? "square-check" : "square"}
          size={20}
          color={selectedIds.has(item.id) ? theme.primary : theme.textMuted}
        />
      </TouchableOpacity>

      {/* 音乐卡片内容 - 点击查看详情 */}
      <TouchableOpacity
        style={styles.musicCardInner}
        onPress={() => setDetailItem(item)}
        activeOpacity={0.7}
      >
        {/* 音乐封面占位 */}
        <View style={[styles.musicCoverContainer, { backgroundColor: theme.backgroundTertiary }]}>
          <FontAwesome6 name="music" size={40} color={theme.primary} />
          <View style={styles.musicCoverInfo}>
            <ThemedText variant="caption" color={theme.textSecondary} numberOfLines={1}>
              {item.metadata?.genre || '音乐'}
            </ThemedText>
            {item.metadata?.duration ? (
              <ThemedText variant="caption" color={theme.textMuted}>
                {item.metadata.duration.toFixed(0)}s
              </ThemedText>
            ) : null}
          </View>
        </View>

        {/* 信息 */}
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <FontAwesome6 name="music" size={14} color={theme.primary} />
            <ThemedText variant="h4" color={theme.textPrimary} style={styles.cardTitle}>
              {item.title}
            </ThemedText>
          </View>
          {(item.metadata?.genre || item.metadata?.mood) ? (
            <ThemedText variant="caption" color={theme.textSecondary} numberOfLines={1} style={styles.cardDescription}>
              {[item.metadata.genre, item.metadata.mood].filter(Boolean).join(' · ')}
            </ThemedText>
          ) : null}
          <ThemedText variant="caption" color={theme.textMuted} style={styles.cardDate}>
            {new Date(item.createdAt).toLocaleDateString('zh-CN')}
          </ThemedText>
        </View>
      </TouchableOpacity>

      {/* 操作按钮 */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleShare(item)}>
          <FontAwesome6 name="share-nodes" size={16} color={theme.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.cardActionBtn} onPress={() => handleDelete(item.id)}>
          <FontAwesome6 name="trash-can" size={16} color={theme.error} />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  const renderPhotoCard = (item: FavoriteItem) => (
    <ThemedView key={item.id} level="default" style={styles.card}>
      {/* 选中标记 */}
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => handleSelectToggle(item.id)}
      >
        <FontAwesome6
          name={selectedIds.has(item.id) ? "square-check" : "square"}
          size={20}
          color={selectedIds.has(item.id) ? theme.primary : theme.textMuted}
        />
      </TouchableOpacity>

      {/* 主图 - 点击查看详情 */}
      <TouchableOpacity
        style={styles.mainImageContainer}
        onPress={() => setDetailItem(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.mainImageUrl }}
          style={styles.mainImage}
          contentFit="cover"
        />
        <View style={styles.cardOverlay}>
          <FontAwesome6
            name="share-nodes"
            size={20}
            color="white"
            style={styles.overlayIcon}
            onPress={() => handleShare(item)}
          />
          <FontAwesome6
            name="trash-can"
            size={20}
            color="white"
            style={styles.overlayIcon}
            onPress={() => handleDelete(item.id)}
          />
        </View>
      </TouchableOpacity>

      {/* 附图 */}
      {item.subImageUrls && item.subImageUrls.length > 0 && (
        <View style={styles.subImagesContainer}>
          {item.subImageUrls.slice(0, 2).map((url, index) => (
            <Image
              key={index}
              source={{ uri: url }}
              style={styles.subImage}
              contentFit="cover"
            />
          ))}
        </View>
      )}

      {/* 信息 */}
      <View style={styles.cardContent}>
        <ThemedText variant="h4" color={theme.textPrimary} style={styles.cardTitle}>
          {item.title}
        </ThemedText>
        <ThemedText
          variant="caption"
          color={theme.textSecondary}
          numberOfLines={2}
          style={styles.cardDescription}
        >
          {item.description}
        </ThemedText>
        <ThemedText variant="caption" color={theme.textMuted} style={styles.cardDate}>
          {new Date(item.createdAt).toLocaleDateString('zh-CN')}
        </ThemedText>
      </View>
    </ThemedView>
  );

  const renderDetailModal = () => {
    if (!detailItem) return null;
    const music = isMusic(detailItem);
    const audioUrl = detailItem.metadata?.audioUrl || '';

    return (
      <Modal
        visible={!!detailItem}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDetailItem(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDetailItem(null)}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailItem(null)}>
              <FontAwesome6 name="xmark" size={20} color={theme.textPrimary} />
            </TouchableOpacity>

            {music ? (
              <>
                {/* 音乐详情 */}
                <View style={[styles.detailMusicCover, { backgroundColor: theme.backgroundTertiary }]}>
                  <FontAwesome6 name="music" size={64} color={theme.primary} />
                </View>
                <ThemedText variant="h2" color={theme.textPrimary} style={styles.detailTitle}>
                  {detailItem.title}
                </ThemedText>
                <View style={styles.detailMetaRow}>
                  {detailItem.metadata?.genre && (
                    <View style={[styles.detailTag, { backgroundColor: theme.backgroundTertiary }]}>
                      <ThemedText variant="caption" color={theme.primary}>
                        {detailItem.metadata.genre}
                      </ThemedText>
                    </View>
                  )}
                  {detailItem.metadata?.mood && (
                    <View style={[styles.detailTag, { backgroundColor: theme.backgroundTertiary }]}>
                      <ThemedText variant="caption" color={theme.primary}>
                        {detailItem.metadata.mood}
                      </ThemedText>
                    </View>
                  )}
                  {detailItem.metadata?.duration && (
                    <View style={[styles.detailTag, { backgroundColor: theme.backgroundTertiary }]}>
                      <ThemedText variant="caption" color={theme.textSecondary}>
                        {detailItem.metadata.duration.toFixed(0)}秒
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* 音频播放器 */}
                {audioUrl && typeof window !== 'undefined' && 'Audio' in window && (
                  <audio
                    controls
                    src={audioUrl}
                    style={{ width: '100%', marginTop: 20, borderRadius: 8 }}
                    autoPlay
                  />
                )}
              </>
            ) : (
              <>
                {/* 图片详情 */}
                {detailItem.mainImageUrl && (
                  <Image
                    source={{ uri: detailItem.mainImageUrl }}
                    style={styles.detailImage}
                    contentFit="contain"
                  />
                )}
                <ThemedText variant="h2" color={theme.textPrimary} style={styles.detailTitle}>
                  {detailItem.title}
                </ThemedText>
                {detailItem.description ? (
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.detailDescription}>
                    {detailItem.description}
                  </ThemedText>
                ) : null}
                {/* 附图 */}
                {detailItem.subImageUrls && detailItem.subImageUrls.length > 0 && (
                  <View style={styles.detailSubImages}>
                    {detailItem.subImageUrls.map((url, index) => (
                      <Image
                        key={index}
                        source={{ uri: url }}
                        style={styles.detailSubImage}
                        contentFit="cover"
                      />
                    ))}
                  </View>
                )}
              </>
            )}

            {/* 底部操作 */}
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={[styles.detailActionBtn, { backgroundColor: theme.primary }]}
                onPress={() => handleShare(detailItem)}
              >
                <FontAwesome6 name="share-nodes" size={16} color={theme.buttonPrimaryText} />
                <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>分享</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.detailActionBtn, { backgroundColor: theme.backgroundTertiary }]}
                onPress={() => { handleDelete(detailItem.id); setDetailItem(null); }}
              >
                <FontAwesome6 name="trash-can" size={16} color={theme.error} />
                <ThemedText variant="smallMedium" color={theme.error}>删除</ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
          style={styles.scrollView}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <ThemedText variant="h2" color={theme.textPrimary} style={styles.headerTitle}>
                我的收藏
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.headerSubtitle}>
                精选创意作品集
              </ThemedText>
            </View>
          </View>

          {favorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <FontAwesome6 name="heart" size={48} color={theme.textMuted} />
              </View>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.emptyText}>
                暂无收藏作品
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.emptyHint}>
                快去创作并收藏你的第一个作品吧
              </ThemedText>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {favorites.map((item) => isMusic(item) ? renderMusicCard(item) : renderPhotoCard(item))}
            </View>
          )}
        </ScrollView>

        {/* 底部控制面板 */}
        {favorites.length > 0 && (
          <ThemedView level="root" style={styles.bottomPanel}>
            <TouchableOpacity
              style={styles.panelButton}
              onPress={handleSelectAll}
            >
              <FontAwesome6
                name={selectedIds.size === favorites.length ? "square-check" : "square"}
                size={20}
                color={theme.primary}
              />
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.panelButtonText}>
                {selectedIds.size === favorites.length ? '取消全选' : '全选'}
              </ThemedText>
            </TouchableOpacity>

            {selectedIds.size > 0 && (
              <>
                <TouchableOpacity
                  style={styles.panelButton}
                  onPress={handleBatchShare}
                >
                  <FontAwesome6 name="share-nodes" size={20} color={theme.primary} />
                  <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.panelButtonText}>
                    分享
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.panelButton}
                  onPress={handleBatchDelete}
                >
                  <FontAwesome6 name="trash-can" size={20} color={theme.error} />
                  <ThemedText variant="smallMedium" color={theme.error} style={styles.panelButtonText}>
                    删除
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.panelButton}
              onPress={handleSyncToMaterials}
            >
              <FontAwesome6 name="arrow-right-to-bracket" size={20} color={theme.primary} />
              <ThemedText variant="smallMedium" color={theme.primary} style={styles.panelButtonText}>
                同步素材
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.panelButton, styles.clearButton]}
              onPress={handleClearAll}
            >
              <FontAwesome6 name="broom" size={20} color={theme.textMuted} />
              <ThemedText variant="smallMedium" color={theme.textMuted} style={styles.panelButtonText}>
                清空
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        {/* 详情弹窗 */}
        {renderDetailModal()}
      </View>
      <Toast message={toastMessage} visible={toastVisible} onHide={hideToast} />
    </Screen>
  );
}
