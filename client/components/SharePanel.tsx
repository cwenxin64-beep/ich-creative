import React, { useEffect, useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, Image, Share as RNShare, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import QRCode from 'qrcode';
import { useToast } from '@/hooks/useToast';

interface SharePanelProps {
  visible: boolean;
  onClose: () => void;
  imageUrl?: string;
  audioUrl?: string;
  title?: string;
  description?: string;
  shareUrl?: string;
}

export default function SharePanel({
  visible,
  onClose,
  imageUrl,
  audioUrl,
  title = '智能非遗作品',
  description = '用AI让非遗"活"在当代',
  shareUrl,
}: SharePanelProps) {
  const { showToast } = useToast();
  const [qrCodeUri, setQrCodeUri] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  // 生成二维码
  useEffect(() => {
    if (visible && shareUrl) {
      generateQRCode(shareUrl);
    }
  }, [visible, shareUrl]);

  const generateQRCode = async (url: string) => {
    try {
      setQrLoading(true);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrCodeUri(dataUrl);
    } catch {
      setQrCodeUri('');
    } finally {
      setQrLoading(false);
    }
  };

  // 保存图片到相册
  const saveImageToAlbum = useCallback(async () => {
    if (!imageUrl) {
      showToast('暂无图片可保存');
      return;
    }
    try {
      setSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast('需要相册权限才能保存');
        return;
      }

      // 通过代理下载图片
      const proxyUrl = imageUrl.startsWith('http')
        ? imageUrl
        : `${getBaseUrl()}${imageUrl}`;

      const downloadResult = await FileSystem.downloadAsync(
        proxyUrl,
        `${FileSystem.cacheDirectory}share_${Date.now()}.jpg`
      );

      await MediaLibrary.createAssetAsync(downloadResult.uri);
      showToast('图片已保存到相册，可从微信相册分享');
    } catch (err) {
      console.error('Save image error:', err);
      showToast('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }, [imageUrl, showToast]);

  // 复制链接
  const copyLink = useCallback(async () => {
    const link = shareUrl || imageUrl || audioUrl || '';
    if (!link) {
      showToast('暂无链接可复制');
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      showToast('链接已复制，可粘贴到微信分享');
    } catch {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('链接已复制，可粘贴到微信分享');
    }
  }, [shareUrl, imageUrl, audioUrl, showToast]);

  // 使用系统分享（移动端）
  const systemShare = useCallback(async () => {
    try {
      if (navigator.share) {
        if (imageUrl) {
          // 尝试分享文件
          try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], `${title}.jpg`, { type: 'image/jpeg' });
            await navigator.share({
              title,
              text: description,
              files: [file],
            });
            return;
          } catch {
            // 文件分享不支持，回退到链接
          }
        }
        await navigator.share({
          title,
          text: description,
          url: shareUrl || imageUrl || audioUrl,
        });
      } else {
        await copyLink();
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        await copyLink();
      }
    }
  }, [imageUrl, audioUrl, title, description, shareUrl, copyLink]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 标题 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>分享到</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 分享方式 */}
          <View style={styles.shareMethods}>
            {/* 保存图片 */}
            {imageUrl && (
              <TouchableOpacity style={styles.methodItem} onPress={saveImageToAlbum} disabled={saving}>
                <View style={[styles.methodIcon, { backgroundColor: '#4CAF50' }]}>
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.methodEmoji}>📷</Text>
                  )}
                </View>
                <Text style={styles.methodLabel}>保存图片</Text>
                <Text style={styles.methodHint}>存到相册后从微信分享</Text>
              </TouchableOpacity>
            )}

            {/* 复制链接 */}
            <TouchableOpacity style={styles.methodItem} onPress={copyLink}>
              <View style={[styles.methodIcon, { backgroundColor: '#FF9800' }]}>
                <Text style={styles.methodEmoji}>🔗</Text>
              </View>
              <Text style={styles.methodLabel}>复制链接</Text>
              <Text style={styles.methodHint}>粘贴到微信聊天</Text>
            </TouchableOpacity>

            {/* 系统分享 */}
            <TouchableOpacity style={styles.methodItem} onPress={systemShare}>
              <View style={[styles.methodIcon, { backgroundColor: '#2196F3' }]}>
                <Text style={styles.methodEmoji}>📤</Text>
              </View>
              <Text style={styles.methodLabel}>更多方式</Text>
              <Text style={styles.methodHint}>调起系统分享</Text>
            </TouchableOpacity>
          </View>

          {/* 二维码 */}
          {shareUrl && (
            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>微信扫一扫查看</Text>
              {qrLoading ? (
                <ActivityIndicator color="#D4A574" size="large" />
              ) : qrCodeUri ? (
                <Image
                  source={{ uri: qrCodeUri }}
                  style={styles.qrCode}
                  resizeMode="contain"
                />
              ) : null}
              <Text style={styles.qrHint}>截图后发送给微信好友扫码</Text>
            </View>
          )}

          {/* 底部提示 */}
          <View style={styles.tips}>
            <Text style={styles.tipsText}>
              💡 提示：保存图片到相册后，在微信聊天中选择相册图片即可分享
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getBaseUrl(): string {
  return process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '';
}

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end' as const,
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    color: '#999',
    fontSize: 18,
  },
  shareMethods: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginBottom: 24,
  },
  methodItem: {
    alignItems: 'center' as const,
    width: 90,
  },
  methodIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  methodEmoji: {
    fontSize: 24,
  },
  methodLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  methodHint: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center' as const,
  },
  qrSection: {
    alignItems: 'center' as const,
    marginBottom: 16,
    paddingVertical: 16,
    backgroundColor: '#16162a',
    borderRadius: 12,
  },
  qrTitle: {
    color: '#D4A574',
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  qrCode: {
    width: 160,
    height: 160,
    borderRadius: 8,
  },
  qrHint: {
    color: '#888',
    fontSize: 11,
    marginTop: 8,
  },
  tips: {
    backgroundColor: '#16162a',
    borderRadius: 8,
    padding: 12,
  },
  tipsText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
};
