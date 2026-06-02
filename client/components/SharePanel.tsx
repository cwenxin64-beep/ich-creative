import React, { useEffect, useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
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
  description = '让非遗"活"在当代',
  shareUrl,
}: SharePanelProps) {
  const { showToast } = useToast();
  const [qrCodeUri, setQrCodeUri] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  // 生成二维码 — 编码网站首页URL，而不是图片URL
  useEffect(() => {
    if (visible) {
      // 用网站首页作为二维码内容，这样别人扫码可以看到应用
      const qrContent = window.location.origin || 'https://ich-client-204193-6-1388119917.sh.run.tcloudbase.com';
      generateQRCode(qrContent);
    }
  }, [visible]);

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

  // 保存/下载图片（Web端 fetch+blob方式）
  const saveImageToAlbum = useCallback(async () => {
    const urlToSave = imageUrl || audioUrl;
    if (!urlToSave) {
      showToast('暂无内容可保存');
      return;
    }
    try {
      setSaving(true);

      // 构建完整URL
      let fullUrl = urlToSave;
      if (!fullUrl.startsWith('http')) {
        const base = window.location.origin || '';
        fullUrl = `${base}${fullUrl}`;
      }

      // 音频文件走代理
      if (audioUrl && fullUrl.includes('volces.com')) {
        const base = window.location.origin || '';
        fullUrl = `${base}/api/v1/audio/proxy?url=${encodeURIComponent(audioUrl!)}`;
      }

      // 图片也走代理避免跨域
      if (imageUrl && !fullUrl.includes('/api/v1/')) {
        const base = window.location.origin || '';
        fullUrl = `${base}/api/v1/image/proxy?url=${encodeURIComponent(fullUrl)}`;
      }

      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error('下载失败');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const ext = audioUrl ? '.mp3' : '.jpg';
      const fileName = `${title || '非遗作品'}_${Date.now()}${ext}`;

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 100);

      showToast(audioUrl ? '音频已保存' : '图片已保存，可在微信中发送');
    } catch (err) {
      console.error('Save error:', err);
      showToast('保存失败，请长按内容保存');
    } finally {
      setSaving(false);
    }
  }, [imageUrl, audioUrl, title, showToast]);

  // 生成分享海报并下载
  const saveSharePoster = useCallback(async () => {
    try {
      setSaving(true);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        showToast('浏览器不支持生成海报');
        return;
      }

      const canvasW = 600;
      const canvasH = imageUrl ? 960 : 600;
      canvas.width = canvasW;
      canvas.height = canvasH;

      // 背景渐变
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

      // 图片 — 通过代理加载避免跨域
      if (imageUrl) {
        try {
          let fullUrl = imageUrl;
          if (!fullUrl.startsWith('http')) {
            fullUrl = `${window.location.origin}${fullUrl}`;
          }
          // 走代理加载图片
          const proxyUrl = `${window.location.origin}/api/v1/image/proxy?url=${encodeURIComponent(fullUrl)}`;
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = proxyUrl;
          });

          const maxImgW = 500;
          const maxImgH = 520;
          const scale = Math.min(maxImgW / img.width, maxImgH / img.height, 1);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const imgX = (canvasW - drawW) / 2;
          const imgY = 100;

          // 白色圆角背景
          ctx.fillStyle = '#ffffff';
          roundRect(ctx, imgX - 10, imgY - 10, drawW + 20, drawH + 20, 12);
          ctx.fill();
          ctx.drawImage(img, imgX, imgY, drawW, drawH);
        } catch {
          // 代理也失败，尝试直接加载
          try {
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error('Image load failed'));
              img.src = imageUrl!;
            });
            const maxImgW = 500;
            const maxImgH = 520;
            const scale = Math.min(maxImgW / img.width, maxImgH / img.height, 1);
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            const imgX = (canvasW - drawW) / 2;
            const imgY = 100;
            ctx.fillStyle = '#ffffff';
            roundRect(ctx, imgX - 10, imgY - 10, drawW + 20, drawH + 20, 12);
            ctx.fill();
            ctx.drawImage(img, imgX, imgY, drawW, drawH);
          } catch {
            ctx.fillStyle = '#555';
            ctx.fillRect(75, 100, 450, 350);
            ctx.fillStyle = '#999';
            ctx.font = '16px sans-serif';
            ctx.fillText('（图片加载失败）', canvasW / 2, 280);
          }
        }
      }

      // 音频图标
      if (audioUrl && !imageUrl) {
        ctx.fillStyle = '#2a2a4e';
        roundRect(ctx, 100, 100, 400, 250, 16);
        ctx.fill();
        ctx.fillStyle = '#D4A574';
        ctx.font = '64px sans-serif';
        ctx.fillText('🎵', canvasW / 2, 230);
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.fillText('点击收听非遗音乐', canvasW / 2, 290);
      }

      // 二维码区域背景
      const qrSectionY = imageUrl ? 680 : 400;
      ctx.fillStyle = '#111128';
      roundRect(ctx, 50, qrSectionY, 500, 180, 12);
      ctx.fill();

      // 二维码
      if (qrCodeUri) {
        try {
          const qrImg = new Image();
          await new Promise<void>((resolve, reject) => {
            qrImg.onload = () => resolve();
            qrImg.onerror = () => reject(new Error('QR load failed'));
            qrImg.src = qrCodeUri;
          });
          const qrSize = 120;
          ctx.drawImage(qrImg, canvasW / 2 - qrSize / 2, qrSectionY + 10, qrSize, qrSize);
          ctx.fillStyle = '#999';
          ctx.font = '13px sans-serif';
          ctx.fillText('扫码查看作品', canvasW / 2, qrSectionY + qrSize + 30);
        } catch {
          // 二维码失败忽略
        }
      } else {
        ctx.fillStyle = '#666';
        ctx.font = '14px sans-serif';
        ctx.fillText('扫码查看作品', canvasW / 2, qrSectionY + 60);
      }

      // 提示文字
      ctx.fillStyle = '#D4A574';
      ctx.font = '12px sans-serif';
      ctx.fillText('长按保存图片 → 打开微信发送给好友', canvasW / 2, qrSectionY + 160);

      // 底部品牌
      ctx.fillStyle = '#555';
      ctx.font = '11px sans-serif';
      ctx.fillText('智能非遗 - 让非遗"活"在当代', canvasW / 2, canvasH - 12);

      // 下载
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast('生成海报失败');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `分享_${title || '非遗作品'}_${Date.now()}.jpg`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        showToast('海报已保存，打开微信发送图片即可');
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('Save poster error:', err);
      showToast('生成海报失败，请尝试保存原图');
    } finally {
      setSaving(false);
    }
  }, [imageUrl, audioUrl, title, description, qrCodeUri, showToast]);

  // 复制链接
  const copyLink = useCallback(async () => {
    const link = window.location.origin || shareUrl || '';
    if (!link) {
      showToast('暂无链接可复制');
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      showToast('链接已复制，可粘贴到微信分享');
    } catch {
      showToast('复制失败，请手动复制');
    }
  }, [shareUrl, showToast]);

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

          {/* 海报预览 */}
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>{title || '智能非遗作品'}</Text>
            <Text style={styles.previewDesc}>{description}</Text>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="cover" />
            ) : audioUrl ? (
              <View style={styles.audioPreview}>
                <Text style={styles.audioEmoji}>🎵</Text>
                <Text style={styles.audioText}>非遗音乐作品</Text>
              </View>
            ) : null}
            {qrCodeUri && (
              <Image source={{ uri: qrCodeUri }} style={styles.previewQR} resizeMode="contain" />
            )}
          </View>

          {/* 分享方式 */}
          <View style={styles.shareMethods}>
            {/* 保存海报 */}
            <TouchableOpacity style={styles.methodItem} onPress={saveSharePoster} disabled={saving}>
              <View style={[styles.methodIcon, { backgroundColor: '#07C160' }]}>
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.methodEmoji}>🎨</Text>
                )}
              </View>
              <Text style={styles.methodLabel}>保存海报</Text>
              <Text style={styles.methodHint}>生成海报发微信</Text>
            </TouchableOpacity>

            {/* 保存原图 */}
            {(imageUrl || audioUrl) && (
              <TouchableOpacity style={styles.methodItem} onPress={saveImageToAlbum} disabled={saving}>
                <View style={[styles.methodIcon, { backgroundColor: '#4CAF50' }]}>
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.methodEmoji}>{audioUrl ? '🎵' : '📷'}</Text>
                  )}
                </View>
                <Text style={styles.methodLabel}>{audioUrl ? '保存音频' : '保存原图'}</Text>
                <Text style={styles.methodHint}>{audioUrl ? '存音频发微信' : '存图片发微信'}</Text>
              </TouchableOpacity>
            )}

            {/* 复制链接 */}
            <TouchableOpacity style={styles.methodItem} onPress={copyLink}>
              <View style={[styles.methodIcon, { backgroundColor: '#FF9800' }]}>
                <Text style={styles.methodEmoji}>🔗</Text>
              </View>
              <Text style={styles.methodLabel}>复制链接</Text>
              <Text style={styles.methodHint}>粘贴到微信</Text>
            </TouchableOpacity>
          </View>

          {/* 底部提示 */}
          <View style={styles.tips}>
            <Text style={styles.tipsText}>
              💡 点击「保存海报」生成带二维码的分享图 → 打开微信 → 从相册发送
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// 圆角矩形辅助函数
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
    maxHeight: '80%' as const,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
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
  previewSection: {
    alignItems: 'center' as const,
    backgroundColor: '#111128',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  previewDesc: {
    color: '#D4A574',
    fontSize: 12,
    marginBottom: 12,
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  audioPreview: {
    width: 200,
    height: 80,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#1a1a3e',
    borderRadius: 8,
    marginBottom: 12,
  },
  audioEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  audioText: {
    color: '#D4A574',
    fontSize: 12,
  },
  previewQR: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
  shareMethods: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginBottom: 16,
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
