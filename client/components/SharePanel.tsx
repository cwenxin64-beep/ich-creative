import React, { useEffect, useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
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

  // Web端下载图片（fetch + blob方式）
  const downloadImageWeb = useCallback(async () => {
    if (!imageUrl) {
      showToast('暂无图片可保存');
      return;
    }
    try {
      setSaving(true);
      const proxyUrl = imageUrl.startsWith('http') ? imageUrl : `${getBaseUrl()}${imageUrl}`;

      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${title || '非遗作品'}_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      showToast('图片已保存，可在微信中发送');
    } catch (err) {
      console.error('Download image error:', err);
      showToast('保存失败，请长按图片保存');
    } finally {
      setSaving(false);
    }
  }, [imageUrl, title, showToast]);

  // 保存图片（兼容 Web 和原生）
  const saveImageToAlbum = useCallback(async () => {
    // Web端用下载方式
    if (typeof window !== 'undefined' && window.document) {
      await downloadImageWeb();
      return;
    }

    // 原生端用 MediaLibrary
    if (!imageUrl) {
      showToast('暂无图片可保存');
      return;
    }
    try {
      setSaving(true);
      const FileSystem = await import('expo-file-system');
      const MediaLibrary = await import('expo-media-library');

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast('需要相册权限才能保存');
        return;
      }

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
  }, [imageUrl, downloadImageWeb, showToast]);

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
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('链接已复制，可粘贴到微信分享');
    }
  }, [shareUrl, imageUrl, audioUrl, showToast]);

  // 生成分享海报并下载
  const saveSharePoster = useCallback(async () => {
    try {
      setSaving(true);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        showToast('生成海报失败');
        return;
      }

      const canvasW = 600;
      const canvasH = imageUrl ? 900 : 500;
      canvas.width = canvasW;
      canvas.height = canvasH;

      // 背景
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasH);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // 顶部装饰线
      ctx.fillStyle = '#D4A574';
      ctx.fillRect(0, 0, canvasW, 4);

      // 标题
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title || '智能非遗作品', canvasW / 2, 50);

      // 副标题
      ctx.fillStyle = '#D4A574';
      ctx.font = '16px sans-serif';
      ctx.fillText(description, canvasW / 2, 78);

      if (imageUrl) {
        // 加载图片
        try {
          const proxyUrl = imageUrl.startsWith('http') ? imageUrl : `${getBaseUrl()}${imageUrl}`;
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = proxyUrl;
          });

          // 绘制图片（居中，保持比例）
          const maxImgW = 500;
          const maxImgH = 550;
          const scale = Math.min(maxImgW / img.width, maxImgH / img.height, 1);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const imgX = (canvasW - drawW) / 2;
          const imgY = 100;

          // 图片背景（白色圆角矩形）
          ctx.fillStyle = '#ffffff';
          roundRect(ctx, imgX - 10, imgY - 10, drawW + 20, drawH + 20, 12);
          ctx.fill();

          ctx.drawImage(img, imgX, imgY, drawW, drawH);
        } catch {
          // 图片加载失败，跳过
          ctx.fillStyle = '#666';
          ctx.font = '16px sans-serif';
          ctx.fillText('（图片加载失败）', canvasW / 2, 350);
        }
      }

      // 二维码区域
      const qrY = imageUrl ? 720 : 120;
      if (shareUrl && qrCodeUri) {
        try {
          const qrImg = new Image();
          await new Promise<void>((resolve, reject) => {
            qrImg.onload = () => resolve();
            qrImg.onerror = () => reject(new Error('QR load failed'));
            qrImg.src = qrCodeUri;
          });
          const qrSize = 100;
          ctx.drawImage(qrImg, canvasW / 2 - qrSize / 2, qrY, qrSize, qrSize);
          ctx.fillStyle = '#999';
          ctx.font = '12px sans-serif';
          ctx.fillText('微信扫码查看作品', canvasW / 2, qrY + qrSize + 20);
        } catch {
          // 二维码加载失败
        }
      }

      // 底部品牌
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.fillText('智能非遗 - 用AI让非遗"活"在当代', canvasW / 2, canvasH - 20);

      // 下载海报
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast('生成海报失败');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `分享_${title || '非遗作品'}_${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('海报已保存，可在微信中发送');
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('Save poster error:', err);
      showToast('生成海报失败');
    } finally {
      setSaving(false);
    }
  }, [imageUrl, audioUrl, title, description, shareUrl, qrCodeUri, showToast]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 标题 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>分享到微信</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 分享方式 */}
          <View style={styles.shareMethods}>
            {/* 生成分享海报 */}
            <TouchableOpacity style={styles.methodItem} onPress={saveSharePoster} disabled={saving}>
              <View style={[styles.methodIcon, { backgroundColor: '#07C160' }]}>
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.methodEmoji}>🎨</Text>
                )}
              </View>
              <Text style={styles.methodLabel}>保存海报</Text>
              <Text style={styles.methodHint}>生成海报图片发微信</Text>
            </TouchableOpacity>

            {/* 保存原图 */}
            {imageUrl && (
              <TouchableOpacity style={styles.methodItem} onPress={saveImageToAlbum} disabled={saving}>
                <View style={[styles.methodIcon, { backgroundColor: '#4CAF50' }]}>
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.methodEmoji}>📷</Text>
                  )}
                </View>
                <Text style={styles.methodLabel}>保存原图</Text>
                <Text style={styles.methodHint}>存图片发微信相册</Text>
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
          </View>

          {/* 二维码 */}
          {shareUrl && (
            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>微信扫一扫查看作品</Text>
              {qrLoading ? (
                <ActivityIndicator color="#D4A574" size="large" />
              ) : qrCodeUri ? (
                <Image
                  source={{ uri: qrCodeUri }}
                  style={styles.qrCode}
                  resizeMode="contain"
                />
              ) : null}
              <Text style={styles.qrHint}>截图发送给微信好友扫码查看</Text>
            </View>
          )}

          {/* 底部提示 */}
          <View style={styles.tips}>
            <Text style={styles.tipsText}>
              💡 提示：点击「保存海报」生成带二维码的分享图，保存后在微信中选择图片发送即可
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// 绘制圆角矩形辅助函数
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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
    width: 95,
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
