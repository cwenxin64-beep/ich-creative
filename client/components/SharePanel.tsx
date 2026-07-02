import React, { useCallback, useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useToast } from '@/hooks/useToast';
import { buildApiUrl } from '@/utils/api';

interface ShareData {
  type?: string;
  favId?: number | string;
  taskId?: string;
  mainImage?: string;
  subImages?: string[];
  video?: string;
  audio?: string;
  description?: string;
  [key: string]: any;
}

interface SharePanelProps {
  visible: boolean;
  onClose: () => void;
  imageUrl?: string;
  audioUrl?: string;
  title?: string;
  description?: string;
  shareUrl?: string;
  shareData?: ShareData;
}

export default function SharePanel({
  visible,
  onClose,
  imageUrl,
  audioUrl,
  title = '智能非遗作品',
  description = '让非遗"活"在当代',
  shareUrl,
  shareData,
}: SharePanelProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [posterDataUrl, setPosterDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [qrContent, setQrContent] = useState<string>(shareUrl || (typeof window !== 'undefined' ? window.location.origin : ''));
  const [innerTip, setInnerTip] = useState<string>('');

  // 显示弹窗内提示（因为外部 Toast 会被 Modal 遮住）
  const showInnerTip = useCallback((msg: string) => {
    setInnerTip(msg);
    setTimeout(() => setInnerTip(''), 2000);
  }, []);

  // 弹窗打开时，先创建分享记录，再生成海报（用短分享 URL）
  useEffect(() => {
    if (!visible) {
      setPosterDataUrl('');
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);

      // 1. 先创建分享记录，拿到 shareId，生成短 URL
      let finalQrUrl = shareUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      if (shareData && typeof window !== 'undefined') {
        try {
          const createUrl = buildApiUrl('/api/v1/share/create');
          const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: shareData.type || 'general',
              data: { ...shareData, title, description },
            }),
          });
          if (createRes.ok) {
            const createJson = await createRes.json();
            if (createJson && createJson.shareId) {
              finalQrUrl = `${window.location.origin}/detail?shareId=${createJson.shareId}`;
              console.log('[SharePanel] Created share:', createJson.shareId, 'short URL:', finalQrUrl);
            } else {
              console.warn('[SharePanel] create response missing shareId:', createJson);
            }
          } else {
            console.warn('[SharePanel] create failed status:', createRes.status);
          }
        } catch (e) {
          console.warn('[SharePanel] Create share failed, fallback to long URL:', e);
        }
      }
      if (cancelled) return;
      setQrContent(finalQrUrl);

      // 2. 生成海报
      try {
        const posterUrl = buildApiUrl('/api/v1/poster');
        const res = await fetch(posterUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            imageUrl: imageUrl || '',
            shareUrl: finalQrUrl,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.dataUrl) {
            console.log('[SharePanel] Poster generated, dataUrl length:', json.dataUrl.length);
            setPosterDataUrl(json.dataUrl);
          } else {
            console.error('[SharePanel] Poster API returned no data');
          }
        } else {
          console.error('[SharePanel] Poster API failed:', res.status);
        }
      } catch (e) {
        console.error('[SharePanel] Poster generation error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = setTimeout(run, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [visible, title, description, imageUrl, shareUrl, shareData]);

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

      let downloaded = false;
      try {
        // 尝试 blob 下载（依赖资源 CORS 允许）
        const response = await fetch(fullUrl, { mode: 'cors' });
        if (!response.ok) throw new Error('http ' + response.status);
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
        downloaded = true;
        showToast(audioUrl ? '音频已保存' : '图片已保存，可在微信中发送');
        showInnerTip(audioUrl ? '✓ 音频已保存' : '✓ 图片已保存');
      } catch (e) {
        // 跨域 fetch 失败，兜底新标签打开原图，让用户手动长按/右键保存
        console.warn('[Share] blob download failed, fallback to open in new tab:', e);
        try {
          window.open(fullUrl, '_blank', 'noopener');
          showToast(audioUrl ? '已打开音频，长按可保存' : '已打开图片，长按/右键保存');
          showInnerTip('✓ 已在新标签打开，长按/右键保存');
          downloaded = true;
        } catch {
          // 忽略
        }
      }

      if (!downloaded) {
        showToast('保存失败，请长按内容保存');
        showInnerTip('保存失败，请长按内容保存');
      }
    } finally {
      setSaving(false);
    }
  }, [imageUrl, audioUrl, title, showToast, showInnerTip]);

  // 保存海报图片（直接下载后端生成的 PNG）
  const saveSharePoster = useCallback(async () => {
    if (!posterDataUrl) {
      showToast('海报生成中，请稍候');
      return;
    }
    try {
      setSaving(true);
      // base64 data URL → Blob → download
      const res = await fetch(posterDataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const fileName = `分享_${title || '非遗作品'}_${Date.now()}.jpg`;
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 100);

      showToast('海报已保存，打开微信发送图片即可');
      showInnerTip('✓ 海报已保存');
    } catch (err) {
      console.error('Save poster error:', err);
      showToast('保存失败，请尝试保存原图');
      showInnerTip('保存失败，请尝试保存原图');
    } finally {
      setSaving(false);
    }
  }, [posterDataUrl, title, showToast, showInnerTip]);

  // 复制链接：优先复制短分享链接 qrContent（含作品信息），fallback 到 shareUrl / 域名
  const copyLink = useCallback(async () => {
    const link = qrContent || shareUrl || (typeof window !== 'undefined' ? window.location.origin : '');
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
      showInnerTip('✓ 链接已复制');
    } catch {
      // 剪贴板 API 失败：兜底用 prompt 弹窗让用户手动复制
      try {
        window.prompt('请手动复制以下链接：', link);
      } catch {
        showToast('复制失败，请手动复制链接');
        showInnerTip('复制失败，请手动复制');
      }
    }
  }, [qrContent, shareUrl, showToast, showInnerTip]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 顶部悬浮提示（Modal 内部，不会被遮盖） */}
          {innerTip ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 24,
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 9999,
              }}
            >
              <View
                style={{
                  backgroundColor: 'rgba(7, 193, 96, 0.95)',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 24,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                  {innerTip}
                </Text>
              </View>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 标题 */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>分享到微信</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 海报预览区域 - 直接显示后端生成的图片 */}
            <View style={styles.posterPreview}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#D4A574" size="large" />
                  <Text style={styles.loadingText}>正在生成海报...</Text>
                </View>
              ) : posterDataUrl ? (
                <img
                  src={posterDataUrl}
                  style={{
                    width: '100%',
                    maxHeight: 420,
                    objectFit: 'contain',
                    borderRadius: 12,
                    display: 'block',
                  }}
                  alt="分享海报"
                />
              ) : (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>海报生成失败</Text>
                </View>
              )}
            </View>

            {/* 分享方式 */}
            <View style={styles.shareMethods}>
              {/* 保存海报 */}
              <TouchableOpacity style={styles.methodItem} onPress={saveSharePoster} disabled={saving || loading}>
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
                点击「保存海报」生成带二维码的分享图 → 打开微信 → 从相册发送
              </Text>
            </View>
          </ScrollView>
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
    maxHeight: '85%' as const,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
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
  posterPreview: {
    width: '100%' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  loadingContainer: {
    width: '100%' as const,
    height: 300,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#16213e',
    borderRadius: 12,
  },
  loadingText: {
    color: '#D4A574',
    fontSize: 14,
    marginTop: 12,
  },
  shareMethods: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginTop: 8,
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
