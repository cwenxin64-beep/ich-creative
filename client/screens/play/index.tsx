import React, { useState, useMemo, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, TextInput, Image, Platform, Share as RNShare, Modal, FlatList } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

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

// 体验载体
const INTERACTION_TYPES = [
  { id: 'craft', name: '工艺', icon: 'palette', color: '#B8860B' },
  { id: 'visual', name: '视觉', icon: 'eye', color: '#D4A574' },
  { id: 'auditory', name: '听觉', icon: 'ear-listen', color: '#C75B5B' },
  { id: 'behavior', name: '行为', icon: 'hand', color: '#7BA05B' },
];

// 产品类型
const PRODUCT_TYPES = [
  { id: 'poster', name: '海报', icon: 'image', color: '#B8860B' },
  { id: 'festival', name: '节日卡', icon: 'star', color: '#D4A574' },
  { id: 'birthday', name: '生日卡', icon: 'cake-candles', color: '#C75B5B' },
  { id: 'newyear', name: '新年卡', icon: 'champagne-glasses', color: '#7BA05B' },
  { id: 'dynamic', name: '动态海报', icon: 'play', color: '#8B5CF6' },
  { id: 'avatar', name: '数字人', icon: 'user-astronaut', color: '#10B981' },
  { id: 'interactive', name: '可交互文创产品', icon: 'gamepad', color: '#EC4899' },
];

// 目标市场
const TARGET_MARKETS = [
  { id: 'america', name: '美洲', icon: 'earth-americas', color: '#3B82F6' },
  { id: 'europe', name: '欧洲', icon: 'earth-europe', color: '#8B5CF6' },
  { id: 'asia', name: '亚洲', icon: 'earth-asia', color: '#10B981' },
  { id: 'oceania', name: '大洋洲', icon: 'earth-oceania', color: '#F59E0B' },
];

// 我的素材单独配置
const MY_MATERIAL_CONFIG = { id: 'my-material', name: '我的素材', icon: 'folder-open', color: '#EC4899' };

export default function PlayScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();

  const [selectedIchType, setSelectedIchType] = useState('');
  const [selectedInteractionTypes, setSelectedInteractionTypes] = useState<string[]>([]);
  const [selectedProductType, setSelectedProductType] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // 我的素材相关状态
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

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
    try {
      /**
       * 服务端文件：server/src/routes/favorites.ts
       * 接口：POST /api/v1/favorites
       * Body 参数：type: string, imageUrl?: string, videoUrl?: string, title: string, metadata?: any
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'play',
          imageUrl: result.mainImageUrl || result.imageUrl,
          videoUrl: result.videoUrl,
          title: result.type,
          metadata: {
            ...result.metadata,
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

  const handleShare = async (result: any) => {
    try {
      const url = result.imageUrl || result.videoUrl;

      if (Platform.OS !== 'web') {
        const message = `我创造了一个${result.type}，快来看看吧！`;

        await RNShare.share({
          message,
          url,
        });
      } else {
        // Web 端复制链接
        if (url) {
          await navigator.clipboard.writeText(url);
          Alert.alert('成功', '链接已复制到剪贴板');
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('分享失败', '请重试');
    }
  };

  const handleGenerate = async () => {
    if (selectedProductType === 'my-material' && !selectedMaterial) {
      setShowMaterialModal(true);
      return;
    }

    if (!text.trim()) {
      Alert.alert('提示', '请输入创意描述');
      return;
    }

    setLoading(true);

    try {
      /**
       * 服务端文件：server/src/routes/play.ts
       * 接口：POST /api/v1/play/generate
       * Body 参数：text: string, ichType: string, interactionType: string, productType: string, targetMarket: string, material?: any
       */
      const requestBody: any = {
        text,
        ichType: selectedIchType,
        interactionTypes: selectedInteractionTypes,
        productType: selectedProductType,
        targetMarket: selectedMarket,
      };

      // 如果选择了"我的素材"，传递素材信息
      if (selectedProductType === 'my-material' && selectedMaterial) {
        requestBody.material = {
          imageUrl: selectedMaterial.mainImageUrl || selectedMaterial.imageUrl,
          videoUrl: selectedMaterial.videoUrl,
          title: selectedMaterial.title,
          metadata: selectedMaterial.metadata,
        };
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/play/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        // 兼容旧数据结构，确保有 mainImageUrl
        const normalizedResults = (data.results || []).map((result: any) => {
          if (result.videoUrl) {
            return {
              ...result,
              mainImageUrl: result.mainImageUrl || (result.videoUrl + '?type=cover'),
              subImageUrl1: result.subImageUrl1 || result.mainImageUrl || (result.videoUrl + '?type=cover'),
              subImageUrl2: result.subImageUrl2 || result.mainImageUrl || (result.videoUrl + '?type=cover'),
            };
          } else if (result.imageUrl) {
            return {
              ...result,
              mainImageUrl: result.mainImageUrl || result.imageUrl,
              subImageUrl1: result.subImageUrl1 || result.mainImageUrl || result.imageUrl,
              subImageUrl2: result.subImageUrl2 || result.mainImageUrl || result.imageUrl,
            };
          }
          return result;
        });
        setResults(normalizedResults);
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
            玩非遗
          </ThemedText>
        </ThemedView>

        {/* 非遗类型选择 */}
        <ThemedView level="root" style={styles.ichTypeSection}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionLabel}>
            非遗类型
          </ThemedText>
          <View style={styles.typeGrid}>
            {ICH_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.typeButton, selectedIchType === type.id && { backgroundColor: theme.primary }]}
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

        {/* 体验载体选择 */}
        <ThemedView level="root" style={styles.interactionTypeSection}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionLabel}>
            体验载体（最多选择两个）
          </ThemedText>
          <View style={styles.typeGrid}>
            {INTERACTION_TYPES.map((type) => {
              const isSelected = selectedInteractionTypes.includes(type.id);
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeButton, isSelected && { backgroundColor: theme.primary }]}
                  onPress={() => {
                    if (isSelected) {
                      // 取消选择
                      setSelectedInteractionTypes(selectedInteractionTypes.filter(id => id !== type.id));
                    } else {
                      // 选择，最多两个
                      if (selectedInteractionTypes.length < 2) {
                        setSelectedInteractionTypes([...selectedInteractionTypes, type.id]);
                      } else {
                        Alert.alert('提示', '最多只能选择两个体验载体');
                      }
                    }
                  }}
                >
                  <FontAwesome6
                    name={type.icon as any}
                    size={18}
                    color={isSelected ? theme.buttonPrimaryText : type.color}
                  />
                  <ThemedText
                    variant="caption"
                    color={isSelected ? theme.buttonPrimaryText : theme.textSecondary}
                  >
                    {type.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </ThemedView>

        {/* 产品类型选择 */}
        <ThemedView level="root" style={styles.productTypeSection}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionLabel}>
            产品类型
          </ThemedText>
          <View style={styles.typeGrid}>
            {PRODUCT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.typeButton, selectedProductType === type.id && { backgroundColor: theme.primary }]}
                onPress={() => setSelectedProductType(type.id)}
              >
                <FontAwesome6
                  name={type.icon as any}
                  size={18}
                  color={selectedProductType === type.id ? theme.buttonPrimaryText : type.color}
                />
                <ThemedText
                  variant="caption"
                  color={selectedProductType === type.id ? theme.buttonPrimaryText : theme.textSecondary}
                >
                  {type.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* 目标市场选择 */}
        <ThemedView level="root" style={styles.marketSection}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.sectionLabel}>
            目标市场
          </ThemedText>
          <View style={styles.typeGrid}>
            {TARGET_MARKETS.map((market) => (
              <TouchableOpacity
                key={market.id}
                style={[styles.typeButton, selectedMarket === market.id && { backgroundColor: theme.primary }]}
                onPress={() => setSelectedMarket(market.id)}
              >
                <FontAwesome6
                  name={market.icon as any}
                  size={18}
                  color={selectedMarket === market.id ? theme.buttonPrimaryText : market.color}
                />
                <ThemedText
                  variant="caption"
                  color={selectedMarket === market.id ? theme.buttonPrimaryText : theme.textSecondary}
                >
                  {market.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>

        {/* Text Input */}
        <ThemedView level="root" style={styles.inputSection}>
          <ThemedText variant="title" color={theme.textPrimary} style={styles.inputLabel}>
            创意描述
          </ThemedText>
          <TextInput
            style={[styles.textInput, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
            placeholder="描述你想要的创意，例如：设计一张融合剪纸元素的春节贺卡..."
            placeholderTextColor={theme.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </ThemedView>

        {/* My Material Section */}
        <ThemedView level="root" style={styles.materialSection}>
          <TouchableOpacity
            style={[
              styles.materialButton,
              selectedProductType === 'my-material' && { backgroundColor: theme.primary }
            ]}
            onPress={() => setShowMaterialModal(true)}
          >
            <FontAwesome6
              name={MY_MATERIAL_CONFIG.icon}
              size={20}
              color={selectedProductType === 'my-material' ? theme.buttonPrimaryText : MY_MATERIAL_CONFIG.color}
            />
            <ThemedText
              variant="body"
              color={selectedProductType === 'my-material' ? theme.buttonPrimaryText : theme.textPrimary}
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
            { backgroundColor: theme.primary, opacity: loading || !text.trim() ? 0.6 : 1 },
          ]}
          onPress={handleGenerate}
          disabled={loading || !text.trim()}
        >
          <FontAwesome6 name="star" size={20} color={theme.buttonPrimaryText} />
          <ThemedText variant="title" color={theme.buttonPrimaryText} style={styles.generateButtonText}>
            {loading ? '生成中...' : '开始创作'}
          </ThemedText>
        </TouchableOpacity>

        {/* Results */}
        {results.length > 0 && (
          <ThemedView level="root" style={styles.resultsSection}>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.resultsTitle}>
              生成结果 ({results.length})
            </ThemedText>
            {results.map((result, index) => (
              <ThemedView key={index} level="root" style={styles.resultCard}>
                <ThemedText variant="smallMedium" color={theme.textSecondary} style={styles.resultType}>
                  {result.type}
                </ThemedText>
                {result.videoUrl ? (
                  <View style={styles.resultImages}>
                    <TouchableOpacity
                      onPress={() => router.push('/detail', {
                        videoUrl: result.videoUrl,
                        mainImageUrl: result.mainImageUrl,
                        subImageUrl1: result.subImageUrl1,
                        subImageUrl2: result.subImageUrl2,
                        description: result.creativeDescription || text,
                      })}
                      style={styles.resultMainImageWrapper}
                    >
                      <Image
                        source={{ uri: result.mainImageUrl }}
                        style={styles.resultMainImage}
                      />
                      <FontAwesome6 name="circle-play" size={48} color="#fff" style={styles.playIcon} />
                    </TouchableOpacity>
                    <View style={styles.resultSubImages}>
                      <TouchableOpacity onPress={() => router.push('/detail', { imageUrl: result.subImageUrl1 })}>
                        <Image
                          source={{ uri: result.subImageUrl1 }}
                          style={styles.resultSubImage}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => router.push('/detail', { imageUrl: result.subImageUrl2 })}>
                        <Image
                          source={{ uri: result.subImageUrl2 }}
                          style={styles.resultSubImage}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : result.mainImageUrl ? (
                  <View style={styles.resultImages}>
                    <TouchableOpacity
                      onPress={() => router.push('/detail', {
                        imageUrl: result.mainImageUrl,
                        subImageUrl1: result.subImageUrl1,
                        subImageUrl2: result.subImageUrl2,
                        description: result.creativeDescription || text,
                      })}
                      style={styles.resultMainImageWrapper}
                    >
                      <Image
                        source={{ uri: result.mainImageUrl }}
                        style={styles.resultMainImage}
                      />
                    </TouchableOpacity>
                    <View style={styles.resultSubImages}>
                      <TouchableOpacity onPress={() => router.push('/detail', { imageUrl: result.subImageUrl1 })}>
                        <Image
                          source={{ uri: result.subImageUrl1 }}
                          style={styles.resultSubImage}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => router.push('/detail', { imageUrl: result.subImageUrl2 })}>
                        <Image
                          source={{ uri: result.subImageUrl2 }}
                          style={styles.resultSubImage}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <FontAwesome6 name="image" size={40} color={theme.primary} />
                    <ThemedText variant="small" color={theme.textMuted}>
                      生成中...
                    </ThemedText>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.resultActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleFavorite(result)}
                  >
                    <FontAwesome6 name="heart" size={16} color={theme.textSecondary} />
                    <ThemedText variant="caption" color={theme.textSecondary} style={styles.actionButtonText}>
                      收藏
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleShare(result)}
                  >
                    <FontAwesome6 name="share-nodes" size={16} color={theme.textSecondary} />
                    <ThemedText variant="caption" color={theme.textSecondary} style={styles.actionButtonText}>
                      分享
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
    </Screen>
  );
}
