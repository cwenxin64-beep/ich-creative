import React, { useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Share, Alert, TouchableOpacity } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Image } from 'expo-image';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { createStyles } from './styles';

interface FavoriteItem {
  id: string;
  title: string;
  description: string;
  mainImageUrl: string;
  subImageUrls?: string[];
  createdAt: string;
}

export default function FavoritesScreen() {
  const router = useSafeRouter();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/favorites`);
      if (response.ok) {
        const data = await response.json();
        // 将后端数据映射到前端数据结构
        const mappedFavorites = (data.favorites || []).map((fav: any) => ({
          id: fav.id,
          title: fav.title || '非遗创意作品',
          description: fav.metadata?.creativeDescription || '',
          mainImageUrl: fav.imageUrl || '',
          subImageUrls: [
            fav.metadata?.subImageUrl1 || '',
            fav.metadata?.subImageUrl2 || '',
            fav.metadata?.staticSubImageUrl1 || '',
            fav.metadata?.staticSubImageUrl2 || '',
          ].filter(Boolean),
          createdAt: fav.createdAt || new Date().toISOString(),
        }));
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
      await Share.share({
        message: `${item.title}\n\n${item.description}\n\n查看更多精彩作品！`,
        url: item.mainImageUrl,
      });
    } catch (error) {
      Alert.alert('提示', '分享失败，请稍后重试');
    }
  };

  const handleBatchShare = async () => {
    if (selectedIds.size === 0) return;

    const items = favorites.filter(f => selectedIds.has(f.id));
    try {
      const message = items.map(item => `${item.title}: ${item.description}`).join('\n\n');
      await Share.share({
        message: `${message}\n\n查看更多精彩作品！`,
      });
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
                `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/favorites/${id}`,
                { method: 'DELETE' }
              );
              if (response.ok) {
                setFavorites(favorites.filter(f => f.id !== id));
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
                fetch(
                  `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/favorites/${id}`,
                  { method: 'DELETE' }
                )
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
                fetch(
                  `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/favorites/${f.id}`,
                  { method: 'DELETE' }
                )
              );
              await Promise.all(deletePromises);
              setFavorites([]);
              setSelectedIds(new Set());
              Alert.alert('成功', '已清空所有收藏');
            } catch (error) {
              Alert.alert('错误', '清空失败，请稍后重试');
            }
          },
        },
      ]
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
            <ThemedText variant="h2" color={theme.textPrimary} style={styles.headerTitle}>
              我的收藏
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.headerSubtitle}>
              精选创意作品集
            </ThemedText>
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
              {favorites.map((item) => (
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

                  {/* 主图 */}
                  <View style={styles.mainImageContainer}>
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
                  </View>

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
              ))}
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
      </View>
    </Screen>
  );
}
