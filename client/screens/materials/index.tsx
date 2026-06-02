import React, { useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, Modal, Dimensions, Platform } from 'react-native';
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
import { buildApiUrl } from '@/utils/api';
import { createStyles } from './styles';

interface MaterialItem {
  id: string;
  type: string;
  sourceUrl: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
  sourceType: string;
  sourceId: number;
  createdAt: string;
}

type FilterType = 'all' | 'image' | 'music';

export default function MaterialsScreen() {
  const router = useSafeRouter();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [detailItem, setDetailItem] = useState<MaterialItem | null>(null);

  const fetchMaterials = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/v1/materials'));
      if (response.ok) {
        const data = await response.json();
        const mapped = (data.materials || []).map((m: any) => ({
          id: String(m.id),
          type: m.type || 'image',
          sourceUrl: m.source_url || '',
          title: m.title || '非遗素材',
          description: m.description || '',
          metadata: m.metadata || {},
          sourceType: m.source_type || 'favorite',
          sourceId: m.source_id,
          createdAt: m.created_at || new Date().toISOString(),
        }));
        setMaterials(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchMaterials();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMaterials();
    setRefreshing(false);
  };

  const handleSync = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/v1/materials/sync'), {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        showToast(data.message || '同步成功');
        await fetchMaterials();
      } else {
        showToast('同步失败，请稍后重试');
      }
    } catch (error) {
      console.error('Sync error:', error);
      showToast('同步失败，请稍后重试');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(buildApiUrl(`/api/v1/materials/${id}`), {
        method: 'DELETE',
      });
      if (response.ok) {
        setMaterials(materials.filter(m => m.id !== id));
        if (detailItem?.id === id) setDetailItem(null);
        showToast('素材已删除');
      }
    } catch (error) {
      showToast('删除失败');
    }
  };

  const isMusic = (item: MaterialItem) => item.type === 'music';

  const filteredMaterials = useMemo(() => {
    if (filter === 'all') return materials;
    return materials.filter(m => m.type === filter);
  }, [materials, filter]);

  const imageCount = materials.filter(m => m.type === 'image').length;
  const musicCount = materials.filter(m => m.type === 'music').length;

  const renderMaterialCard = (item: MaterialItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.materialCard}
      onPress={() => setDetailItem(item)}
      activeOpacity={0.7}
    >
      {isMusic(item) ? (
        <View style={styles.musicCardCover}>
          <FontAwesome6 name="music" size={36} color={theme.primary} />
          {item.metadata?.genre && (
            <ThemedText variant="caption" color={theme.textSecondary} style={{ marginTop: 8 }}>
              {item.metadata.genre}
            </ThemedText>
          )}
        </View>
      ) : (
        item.sourceUrl ? (
          <Image
            source={{ uri: item.sourceUrl }}
            style={styles.materialImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.materialImage, { backgroundColor: theme.backgroundTertiary, justifyContent: 'center', alignItems: 'center' }]}>
            <FontAwesome6 name="image" size={32} color={theme.textMuted} />
          </View>
        )
      )}
      <View style={styles.materialInfo}>
        <ThemedText variant="smallMedium" color={theme.textPrimary} numberOfLines={1} style={styles.materialTitle}>
          {item.title}
        </ThemedText>
        <ThemedText variant="caption" color={theme.textMuted} style={styles.materialType}>
          {isMusic(item) ? '音乐素材' : '图片素材'}
        </ThemedText>
      </View>
    </TouchableOpacity>
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
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailItem(null)}>
              <FontAwesome6 name="xmark" size={20} color={theme.textPrimary} />
            </TouchableOpacity>

            {music ? (
              <>
                <View style={styles.detailMusicCover}>
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
                </View>
                {audioUrl && typeof window !== 'undefined' && 'Audio' in window && (
                  <audio controls src={audioUrl} style={{ width: '100%', marginTop: 16, borderRadius: 8 }} />
                )}
              </>
            ) : (
              <>
                {detailItem.sourceUrl ? (
                  <Image
                    source={{ uri: detailItem.sourceUrl }}
                    style={styles.detailImage}
                    contentFit="contain"
                  />
                ) : null}
                <ThemedText variant="h2" color={theme.textPrimary} style={styles.detailTitle}>
                  {detailItem.title}
                </ThemedText>
              </>
            )}

            <View style={styles.detailActions}>
              <TouchableOpacity
                style={[styles.detailActionBtn, { backgroundColor: '#DC2626' }]}
                onPress={() => { handleDelete(detailItem.id); setDetailItem(null); }}
              >
                <FontAwesome6 name="trash-can" size={16} color="#FFFFFF" />
                <ThemedText variant="smallMedium" color="#FFFFFF">删除</ThemedText>
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
          }
          style={styles.scrollView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <ThemedText variant="h2" color={theme.textPrimary} style={styles.headerTitle}>
                我的素材
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>
                创作素材资源库
              </ThemedText>
            </View>
          </View>

          {/* Filter Bar */}
          <View style={styles.filterBar}>
            {[
              { key: 'all' as FilterType, label: '全部' },
              { key: 'image' as FilterType, label: `图片 (${imageCount})` },
              { key: 'music' as FilterType, label: `音乐 (${musicCount})` },
            ].map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterButton, filter === f.key && styles.filterButtonActive]}
                onPress={() => setFilter(f.key)}
              >
                <ThemedText
                  variant="smallMedium"
                  style={[styles.filterButtonText, filter === f.key && styles.filterButtonTextActive]}
                >
                  {f.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <ThemedText variant="caption" color={theme.textMuted}>
              共 {filteredMaterials.length} 个素材
            </ThemedText>
            <TouchableOpacity onPress={handleSync}>
              <ThemedText variant="smallMedium" color={theme.primary}>
                从收藏同步
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Materials Grid */}
          {filteredMaterials.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <FontAwesome6 name="box-open" size={48} color={theme.textMuted} />
              </View>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.emptyText}>
                暂无素材
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.emptyHint}>
                收藏作品后同步到这里，作为创作素材
              </ThemedText>
              <TouchableOpacity style={styles.syncButton} onPress={handleSync}>
                <ThemedText style={styles.syncButtonText}>从收藏同步</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {filteredMaterials.map(renderMaterialCard)}
            </View>
          )}
        </ScrollView>

        {renderDetailModal()}
      </View>
      <Toast message={toastMessage} visible={toastVisible} onHide={hideToast} />
    </Screen>
  );
}
