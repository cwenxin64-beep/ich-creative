import React, { useState, useMemo, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, TextInput, Image, Platform, Modal } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';
import { CustomizeOrderModal, CustomizeOrderData } from './CustomizeOrderModal';
import { Spacing } from '@/constants/theme';

// 非遗类型
const ICH_TYPES = [
  { id: 'jingdezhen', name: '景德镇陶瓷', icon: 'mug-hot', color: '#B8860B' },
  { id: 'guqin', name: '古琴艺术', icon: 'music', color: '#8B5CF6' },
  { id: 'xiangyunsha', name: '香云纱', icon: 'shirt', color: '#C75B5B' },
  { id: 'ru', name: '汝瓷', icon: 'wine-glass', color: '#7BA05B' },
  { id: 'luban', name: '鲁班锁', icon: 'puzzle-piece', color: '#EC4899' },
  { id: 'silkworm', name: '桑蚕丝织技艺', icon: 'wand-sparkles', color: '#F472B6' },
  { id: 'paper-cut', name: '中国剪纸', icon: 'scissors', color: '#F59E0B' },
  { id: 'taiji', name: '太极拳', icon: 'yin-yang', color: '#10B981' },
  { id: 'jingju', name: '京剧', icon: 'masks-theater', color: '#14B8A6' },
  { id: 'other', name: '其他', icon: 'ellipsis', color: '#6B7280' },
];

// 体验类型
const INTERACTION_TYPES = [
  { id: 'inheritor', name: '传承人', icon: 'users', color: '#B8860B' },
  { id: 'creator', name: '创作者', icon: 'pen-fancy', color: '#D4A574' },
  { id: 'explorer', name: '探索者', icon: 'compass', color: '#7BA05B' },
  { id: 'artist', name: '艺术家', icon: 'palette', color: '#C75B5B' },
  { id: 'consumer', name: '消费者', icon: 'user', color: '#EC4899' },
];

// 应用场景
const APPLICATION_SCENES = [
  { id: 'fashion', name: '时尚配饰', icon: 'shirt', color: '#B8860B' },
  { id: 'home', name: '家居装饰', icon: 'couch', color: '#D4A574' },
  { id: 'art', name: '艺术品', icon: 'palette', color: '#7BA05B' },
  { id: 'gifts', name: '礼品', icon: 'gift', color: '#C75B5B' },
];

// 我的素材单独配置
const MY_MATERIAL_CONFIG = { id: 'my-material', name: '我的素材', icon: 'folder-open', color: '#EC4899' };

export default function UseScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [selectedIchType, setSelectedIchType] = useState('');
  const [selectedInteractionType, setSelectedInteractionType] = useState('');
  const [selectedScene, setSelectedScene] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  // 定制相关状态（使用新的定制需求单）
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  // 我的素材相关状态
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [sharingResults, setSharingResults] = useState<Set<string>>(new Set());

  // 加载收藏列表
  const loadFavorites = async () => {
    setLoadingFavorites(true);
    try {
      /**
       * 服务端文件：server/src/routes/favorites.ts
       * 接口：GET /api/v1/favorites
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/favorites`);
      const data = await response.json();

      if (data.success) {
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error('Load favorites error:', error);
      Alert.alert('错误', '加载收藏失败');
    } finally {
      setLoadingFavorites(false);
    }
  };

  // 当打开素材选择Modal时加载收藏
  useEffect(() => {
    if (showMaterialModal) {
      loadFavorites();
    }
  }, [showMaterialModal]);

  const handleFavorite = async (result: any) => {
    const resultId = result.mainImageUrl || result.id;

    try {
      /**
       * 服务端文件：server/src/routes/favorites.ts
       * 接口：POST /api/v1/favorites
       * Body 参数：type: string, imageUrl?: string, title: string, metadata?: any
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'use',
          imageUrl: result.mainImageUrl,
          title: result.category || '非遗定制作品',
          metadata: {
            ...result.metadata,
            subImageUrl1: result.subImageUrl1,
            subImageUrl2: result.subImageUrl2,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFavoritedIds(prev => new Set(prev).add(data.id));
        Alert.alert('成功', '已添加到收藏');
      } else {
        Alert.alert('收藏失败', data.message || '请重试');
      }
    } catch (error) {
      console.error('Favorite error:', error);
      Alert.alert('错误', '收藏失败，请检查网络连接');
    }
  };

  const handleShare = async (result: any) => {
    try {
      const url = result.mainImageUrl || result.imageUrl;

      if (!url) {
        Alert.alert('提示', '没有可分享的内容');
        return;
      }

      const resultId = result.mainImageUrl || result.imageUrl || JSON.stringify(result);

      if (Platform.OS === 'web') {
        // Web 端复制链接
        await navigator.clipboard.writeText(url);
        Alert.alert('成功', '链接已复制到剪贴板');
        return;
      }

      // 移动端：下载图片并分享
      setSharingResults(prev => new Set(prev).add(resultId));

      // 生成临时文件名
      const fileExtension = url.includes('.mp4') ? 'mp4' : 'jpg';
      const fileName = `ich_custom_${Date.now()}.${fileExtension}`;
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
        setSharingResults(prev => {
          const newSet = new Set(prev);
          newSet.delete(resultId);
          return newSet;
        });
        return;
      }

      // 分享文件
      const categoryName = result.category || '非遗';
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: fileExtension === 'mp4' ? 'video/mp4' : 'image/jpeg',
        dialogTitle: `分享${categoryName}非遗作品`,
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('分享失败', '请检查网络连接后重试');
    } finally {
      const resultId = result.mainImageUrl || result.imageUrl || JSON.stringify(result);
      setSharingResults(prev => {
        const newSet = new Set(prev);
        newSet.delete(resultId);
        return newSet;
      });
    }
  };

  const handleGenerate = async () => {
    if (selectedScene === 'my-material' && !selectedMaterial) {
      setShowMaterialModal(true);
      return;
    }

    if (!keywords.trim()) {
      Alert.alert('提示', '请输入创意关键词');
      return;
    }

    setLoading(true);

    try {
      /**
       * 服务端文件：server/src/routes/use.ts
       * 接口：POST /api/v1/use/customize
       * Body 参数：keywords: string, ichType: string, interactionType: string, applicationScene: string, material?: any
       */
      const requestBody: any = {
        keywords,
        ichType: selectedIchType,
        interactionType: selectedInteractionType,
        applicationScene: selectedScene,
      };

      // 如果选择了"我的素材"，传递素材信息
      if (selectedScene === 'my-material' && selectedMaterial) {
        requestBody.material = {
          imageUrl: selectedMaterial.mainImageUrl || selectedMaterial.imageUrl,
          videoUrl: selectedMaterial.videoUrl,
          title: selectedMaterial.title,
          metadata: selectedMaterial.metadata,
        };
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/use/customize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
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

  const handleOpenCustomizeModal = async () => {
    setShowCustomizeModal(true);
  };

  const handleSubmitCustomization = async (data: CustomizeOrderData) => {
    try {
      /**
       * 服务端文件：server/src/routes/use.ts
       * 接口：POST /api/v1/use/customization-order
       * Body 参数：完整的定制需求单数据（包含基础信息和定制需求信息）
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/use/customization-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          orderId: Date.now().toString(),
          status: 'pending',
          createdAt: new Date().toISOString(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('提交成功', '您的定制需求单已提交成功，我们会尽快联系您！');
        setShowCustomizeModal(false);
      } else {
        Alert.alert('提交失败', result.message || '请重试');
      }
    } catch (error) {
      console.error('Customization error:', error);
      Alert.alert('错误', '提交失败，请检查网络连接');
      throw error;
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
            用非遗
          </ThemedText>
        </ThemedView>

        {/* 非遗类型选择 */}
        <ThemedView level="root" style={styles.ichTypeSection}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionLabel}>
            非遗类型
          </ThemedText>
          <View style={styles.categoryGrid}>
            {ICH_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.categoryButton, selectedIchType === type.id && { backgroundColor: theme.primary }]}
                onPress={() => setSelectedIchType(type.id)}
              >
                <FontAwesome6
                  name={type.icon as any}
                  size={18}
                  color={selectedIchType === type.id ? theme.buttonPrimaryText : type.color}
                />
                <ThemedText
                  variant="caption"
                  color={selectedIchType === type.id ? theme.buttonPrimaryText : theme.textSecondary}
                >
                  {type.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* 体验类型选择 */}
        <ThemedView level="root" style={styles.interactionTypeSection}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionLabel}>
            体验类型
          </ThemedText>
          <View style={styles.categoryGrid}>
            {INTERACTION_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.categoryButton, selectedInteractionType === type.id && { backgroundColor: theme.primary }]}
                onPress={() => setSelectedInteractionType(type.id)}
              >
                <FontAwesome6
                  name={type.icon as any}
                  size={18}
                  color={selectedInteractionType === type.id ? theme.buttonPrimaryText : type.color}
                />
                <ThemedText
                  variant="caption"
                  color={selectedInteractionType === type.id ? theme.buttonPrimaryText : theme.textSecondary}
                >
                  {type.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* 应用场景选择 */}
        <ThemedView level="root" style={styles.sceneSection}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionLabel}>
            应用场景
          </ThemedText>
          <View style={styles.categoryGrid}>
            {APPLICATION_SCENES.map((scene) => (
              <TouchableOpacity
                key={scene.id}
                style={[styles.categoryButton, selectedScene === scene.id && { backgroundColor: theme.primary }]}
                onPress={() => setSelectedScene(scene.id)}
              >
                <FontAwesome6
                  name={scene.icon}
                  size={18}
                  color={selectedScene === scene.id ? theme.buttonPrimaryText : scene.color}
                />
                <ThemedText
                  variant="caption"
                  color={selectedScene === scene.id ? theme.buttonPrimaryText : theme.textSecondary}
                >
                  {scene.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* Keywords Input */}
        <ThemedView level="root" style={styles.inputSection}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.inputLabel}>
            创意关键词
          </ThemedText>
          <TextInput
            style={[styles.textInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
            placeholder="输入关键词，例如：中国风、简约、现代、传统..."
            placeholderTextColor={theme.textMuted}
            value={keywords}
            onChangeText={setKeywords}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </ThemedView>

        {/* My Material Section */}
        <ThemedView level="root" style={styles.materialSection}>
          <TouchableOpacity
            style={[
              styles.materialButton,
              selectedScene === 'my-material' && { backgroundColor: theme.primary }
            ]}
            onPress={() => setShowMaterialModal(true)}
          >
            <FontAwesome6
              name={MY_MATERIAL_CONFIG.icon}
              size={20}
              color={selectedScene === 'my-material' ? theme.buttonPrimaryText : MY_MATERIAL_CONFIG.color}
            />
            <ThemedText
              variant="body"
              color={selectedScene === 'my-material' ? theme.buttonPrimaryText : theme.textPrimary}
              style={styles.materialButtonText}
            >
              {MY_MATERIAL_CONFIG.name}
            </ThemedText>
            {selectedMaterial && (
              <View style={styles.selectedMaterialIndicator}>
                <FontAwesome6 name="circle-check" size={16} color={theme.success} />
              </View>
            )}
          </TouchableOpacity>
          {selectedMaterial && (
            <ThemedView level="default" style={styles.selectedMaterialCard}>
              <Image
                source={{ uri: selectedMaterial.mainImageUrl || selectedMaterial.imageUrl }}
                style={styles.selectedMaterialImage}
              />
              <View style={styles.selectedMaterialInfo}>
                <ThemedText variant="smallMedium" color={theme.textPrimary} numberOfLines={1}>
                  {selectedMaterial.title}
                </ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>
                  已选择素材
                </ThemedText>
              </View>
              <TouchableOpacity onPress={() => setSelectedMaterial(null)}>
                <FontAwesome6 name="xmark" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </ThemedView>
          )}
        </ThemedView>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            { backgroundColor: theme.primary, opacity: loading || !keywords.trim() ? 0.6 : 1 },
          ]}
          onPress={handleGenerate}
          disabled={loading || !keywords.trim()}
        >
          <FontAwesome6 name="wand-magic-sparkles" size={20} color={theme.buttonPrimaryText} />
          <ThemedText variant="title" color={theme.buttonPrimaryText} style={styles.generateButtonText}>
            {loading ? '生成中...' : '定制生成'}
          </ThemedText>
        </TouchableOpacity>

        {/* Customization Button */}
        <TouchableOpacity
          style={[
            styles.customizeButton,
            { backgroundColor: theme.accent, opacity: showCustomizeModal ? 0.6 : 1 },
          ]}
          onPress={handleOpenCustomizeModal}
          disabled={showCustomizeModal}
        >
          <FontAwesome6 name="shop" size={20} color={theme.buttonPrimaryText} />
          <ThemedText variant="title" color={theme.buttonPrimaryText} style={styles.customizeButtonText}>
            非遗创意产品定制
          </ThemedText>
        </TouchableOpacity>

        {/* Results */}
        {results.length > 0 && (
          <ThemedView level="root" style={styles.resultsSection}>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.resultsTitle}>
              定制结果 ({results.length})
            </ThemedText>
            {results.map((result, index) => (
              <ThemedView key={index} level="root" style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultHeaderLeft}>
                    <FontAwesome6 name="tag" size={16} color={theme.primary} />
                    <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.resultCategory}>
                      {result.category}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => handleFavorite(result)}
                  >
                    <FontAwesome6
                      name={favoritedIds.has(result.mainImageUrl || result.id) ? "heart" : "heart"}
                      size={20}
                      solid={favoritedIds.has(result.mainImageUrl || result.id)}
                      color={favoritedIds.has(result.mainImageUrl || result.id) ? "#EF4444" : theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {result.mainImageUrl ? (
                  <View style={styles.resultImagesContainer}>
                    <TouchableOpacity
                      onPress={() => router.push('/detail', {
                        imageUrl: result.mainImageUrl,
                        subImageUrl1: result.subImageUrl1,
                        subImageUrl2: result.subImageUrl2,
                        description: result.creativeDescription || keywords,
                      })}
                    >
                      <Image source={{ uri: result.mainImageUrl }} style={styles.resultImage} />
                    </TouchableOpacity>
                    <View style={styles.resultSubImages}>
                      <TouchableOpacity onPress={() => router.push('/detail', { imageUrl: result.subImageUrl1 })}>
                        <Image source={{ uri: result.subImageUrl1 }} style={styles.resultSubImage} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => router.push('/detail', { imageUrl: result.subImageUrl2 })}>
                        <Image source={{ uri: result.subImageUrl2 }} style={styles.resultSubImage} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <FontAwesome6 name="image" size={40} color={theme.primary} />
                    <ThemedText variant="small" color={theme.textMuted}>
                      设计生成中...
                    </ThemedText>
                  </View>
                )}
                {result.metadata?.ichElements && (
                  <ThemedView level="root" style={styles.metadata}>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      元素: {result.metadata.ichElements.join(', ')}
                    </ThemedText>
                  </ThemedView>
                )}

                {/* Action Buttons */}
                <View style={styles.resultActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, sharingResults.has(result.mainImageUrl || result.imageUrl) && { opacity: 0.5 }]}
                    onPress={() => handleShare(result)}
                    disabled={sharingResults.has(result.mainImageUrl || result.imageUrl)}
                  >
                    <FontAwesome6 name="share-nodes" size={16} color={theme.textSecondary} />
                    <ThemedText variant="caption" color={theme.textSecondary} style={styles.actionButtonText}>
                      {sharingResults.has(result.mainImageUrl || result.imageUrl) ? '分享中...' : '分享'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            ))}
          </ThemedView>
        )}
      </ScrollView>

      {/* Material Selection Modal */}
      <Modal
        visible={showMaterialModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMaterialModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>
                选择我的素材
              </ThemedText>
              <TouchableOpacity onPress={() => setShowMaterialModal(false)}>
                <FontAwesome6 name="xmark" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Material List */}
            <ScrollView style={styles.modalBody}>
              {loadingFavorites ? (
                <View style={styles.loadingContainer}>
                  <FontAwesome6 name="spinner" size={32} color={theme.primary} />
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.loadingText}>
                    加载中...
                  </ThemedText>
                </View>
              ) : favorites.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <FontAwesome6 name="folder-open" size={48} color={theme.textMuted} />
                  <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
                    暂无收藏的素材
                  </ThemedText>
                </View>
              ) : (
                favorites.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.materialItem,
                      selectedMaterial?.id === item.id && styles.materialItemSelected,
                    ]}
                    onPress={() => setSelectedMaterial(item)}
                  >
                    {item.mainImageUrl || item.imageUrl ? (
                      <Image
                        source={{ uri: item.mainImageUrl || item.imageUrl }}
                        style={styles.materialItemImage}
                      />
                    ) : item.videoUrl ? (
                      <View style={styles.materialItemVideo}>
                        <Image
                          source={{ uri: item.videoUrl + '?type=cover' }}
                          style={styles.materialItemImage}
                        />
                        <FontAwesome6 name="play" size={24} color="#fff" style={styles.materialPlayIcon} />
                      </View>
                    ) : (
                      <View style={styles.materialItemPlaceholder}>
                        <FontAwesome6 name="image" size={32} color={theme.textMuted} />
                      </View>
                    )}
                    <View style={styles.materialItemInfo}>
                      <ThemedText variant="body" color={theme.textPrimary}>
                        {item.title}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textSecondary}>
                        {item.type}
                      </ThemedText>
                    </View>
                    {selectedMaterial?.id === item.id && (
                      <FontAwesome6 name="circle-check" size={24} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setSelectedMaterial(null);
                  setShowMaterialModal(false);
                }}
              >
                <ThemedText variant="title" color={theme.textSecondary}>
                  取消
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, !selectedMaterial && styles.modalButtonDisabled]}
                onPress={() => {
                  if (selectedMaterial) {
                    setShowMaterialModal(false);
                    handleGenerate();
                  }
                }}
                disabled={!selectedMaterial}
              >
                <ThemedText variant="title" color={selectedMaterial ? theme.buttonPrimaryText : theme.textMuted}>
                  确认使用
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Customization Order Modal */}
      <CustomizeOrderModal
        visible={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        onSubmit={handleSubmitCustomization}
      />
    </Screen>
  );
}
