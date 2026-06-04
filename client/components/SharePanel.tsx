import React, { useCallback, useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useToast } from '@/hooks/useToast';
import { buildApiUrl } from '@/utils/api';

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
  const [saving, setSaving] = useState(false);
  const [qrImageData, setQrImageData] = useState<string>('');
  const [posterImageData, setPosterImageData] = useState<string>('');
  const [posterEl, setPosterEl] = useState<HTMLDivElement | null>(null);

  const qrContent = shareUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  // 弹窗打开时，通过后端 API 生成二维码 base64 和图片 base64
  useEffect(() => {
    if (!visible) {
      setQrImageData('');
      setPosterImageData('');
      return;
    }

    const prepare = async () => {
      // 1. 通过后端 API 生成二维码
      try {
        const qrUrl = buildApiUrl(`/api/v1/qrcode?text=${encodeURIComponent(qrContent)}&size=200`);
        const qrRes = await fetch(qrUrl);
        if (qrRes.ok) {
          const qrJson = await qrRes.json();
          if (qrJson.dataUrl) {
            console.log('[SharePanel] QR from API, length:', qrJson.dataUrl.length);
            setQrImageData(qrJson.dataUrl);
          }
        } else {
          console.error('[SharePanel] QR API failed:', qrRes.status);
        }
      } catch (e) {
        console.error('[SharePanel] QR fetch error:', e);
      }

      // 2. 通过后端图片代理转 base64（避免 CORS）
      if (imageUrl && imageUrl.startsWith('http')) {
        try {
          const imgUrl = buildApiUrl(`/api/v1/imageproxy?url=${encodeURIComponent(imageUrl)}&base64=1`);
          const imgRes = await fetch(imgUrl);
          if (imgRes.ok) {
            const imgJson = await imgRes.json();
            if (imgJson.dataUrl) {
              console.log('[SharePanel] Image base64 from proxy, length:', imgJson.dataUrl.length);
              setPosterImageData(imgJson.dataUrl);
            }
          } else {
            console.warn('[SharePanel] Image proxy failed:', imgRes.status);
          }
        } catch (e) {
          console.warn('[SharePanel] Image proxy error:', e);
        }
      }
    };

    const timer = setTimeout(prepare, 300);
    return () => clearTimeout(timer);
  }, [visible, qrContent, imageUrl]);

  // 保存原图/音频
  const saveOriginal = useCallback(async () => {
    const urlToSave = imageUrl || audioUrl;
    if (!urlToSave) {
      showToast('暂无内容可保存');
      return;
    }
    try {
      setSaving(true);
      let fullUrl = urlToSave;
      if (!fullUrl.startsWith('http')) {
        fullUrl = `${window.location.origin}${fullUrl}`;
      }

      // 音频走代理
      if (audioUrl && fullUrl.includes('volces.com')) {
        fullUrl = buildApiUrl(`/api/v1/audio/proxy?url=${encodeURIComponent(audioUrl!)}`);
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
    } catch {
      showToast('保存失败，请长按内容保存');
    } finally {
      setSaving(false);
    }
  }, [imageUrl, audioUrl, title, showToast]);

  // 生成分享海报并下载
  const saveSharePoster = useCallback(async () => {
    try {
      setSaving(true);

      const html2canvas = (await import('html2canvas')).default;
      if (!posterEl) {
        showToast('生成海报失败');
        return;
      }

      const canvas = await html2canvas(posterEl, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

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
  }, [title, showToast, posterEl]);

  // 复制链接
  const copyLink = useCallback(async () => {
    const link = shareUrl || (typeof window !== 'undefined' ? window.location.origin : '');
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

  // 海报中使用的图片 src：优先 base64（html2canvas 可渲染），否则原始 URL
  const posterImageSrc = posterImageData || imageUrl;

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

          {/* 海报预览区域 */}
          <div
            ref={setPosterEl}
            style={{
              width: '100%',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            {/* 顶部装饰线 */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#D4A574' }} />

            {/* 标题 */}
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 6, textAlign: 'center' as const }}>
              {title}
            </div>
            <div style={{ color: '#D4A574', fontSize: 13, marginBottom: 16, textAlign: 'center' as const }}>
              {description}
            </div>

            {/* 作品图片 - 使用 base64 或代理 URL */}
            {posterImageSrc && (
              <img
                src={posterImageSrc}
                style={{
                  width: '80%',
                  maxHeight: 240,
                  borderRadius: 10,
                  objectFit: 'cover' as const,
                  marginBottom: 16,
                  backgroundColor: '#2a2a4e',
                }}
                onError={(e: any) => {
                  e.target.style.display = 'none';
                }}
              />
            )}

            {/* 音频图标 */}
            {audioUrl && !imageUrl && (
              <div style={{
                width: '80%',
                height: 120,
                borderRadius: 10,
                background: '#2a2a4e',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🎵</div>
                <div style={{ color: '#D4A574', fontSize: 14 }}>点击收听非遗音乐</div>
              </div>
            )}

            {/* 二维码区域 - 使用后端返回的 base64 PNG data URL */}
            {qrImageData ? (
              <div style={{
                background: '#ffffff',
                borderRadius: 10,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <img
                  src={qrImageData}
                  style={{ width: 100, height: 100, display: 'block' }}
                />
                <div style={{ color: '#666', fontSize: 11, marginTop: 6 }}>扫码查看作品</div>
              </div>
            ) : (
              <div style={{
                background: '#ffffff',
                borderRadius: 10,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 12,
                width: 124,
                height: 124,
                justifyContent: 'center',
              }}>
                <div style={{ color: '#999', fontSize: 11 }}>生成二维码中...</div>
              </div>
            )}

            {/* 提示 */}
            <div style={{ color: '#D4A574', fontSize: 11, textAlign: 'center' as const, marginBottom: 8 }}>
              长按保存图片 → 打开微信发送给好友
            </div>

            {/* 品牌 */}
            <div style={{ color: '#555', fontSize: 10, textAlign: 'center' as const }}>
              智能非遗 · 让非遗"活"在当代
            </div>
          </div>

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
              <TouchableOpacity style={styles.methodItem} onPress={saveOriginal} disabled={saving}>
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
  shareMethods: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginTop: 16,
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
