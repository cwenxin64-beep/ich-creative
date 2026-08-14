const api = require('../../utils/api');
const { encodeParam } = require('../../utils/format');

Page({
  data: {
    selectedImage: '',
    description: '',
    loading: false,
    progress: 0,
    result: null,
    analysisText: '',
    isFavorited: false,
    favoriteId: ''
  },

  progressTimer: null,

  onUnload() {
    this.stopProgress();
  },

  onDescription(event) {
    this.setData({ description: event.detail.value });
  },

  clearCreationState(extraData) {
    this.stopProgress();
    this.setData(Object.assign({
      progress: 0,
      result: null,
      analysisText: '',
      isFavorited: false,
      favoriteId: ''
    }, extraData || {}));
  },

  chooseImage(event) {
    if (this.data.loading) {
      wx.showToast({ title: '请等待当前生成完成', icon: 'none' });
      return;
    }

    const source = event.currentTarget.dataset.source || 'album';
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: [source],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (file && file.tempFilePath) {
          this.clearCreationState({ selectedImage: file.tempFilePath });
        }
      }
    });
  },

  resetAll() {
    if (this.data.loading) {
      wx.showToast({ title: '请等待当前生成完成', icon: 'none' });
      return;
    }

    this.clearCreationState({
      selectedImage: '',
      description: ''
    });
  },

  startProgress() {
    this.stopProgress();
    this.progressTimer = setInterval(() => {
      if (this.data.progress >= 90) return;
      this.setData({ progress: Math.min(90, this.data.progress + 6) });
    }, 2000);
  },

  stopProgress() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  },

  async generate() {
    if (!this.data.selectedImage) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }

    const description = this.data.description.trim() || '基于原图元素进行非遗风格的创意再创作，突出中国传统美学与现代设计的融合。';
    this.clearCreationState({ loading: true });
    this.startProgress();

    try {
      const created = await api.upload('/api/v1/photo/generate', this.data.selectedImage, {
        description,
        outputType: 'static'
      });

      if (!created.taskId) {
        throw new Error(created.message || created.error || '创建任务失败');
      }

      const result = await api.poll(`/api/v1/photo/status/${created.taskId}`, (data) => {
        if (data.status === 'completed') return { done: true, value: data.result };
        if (data.status === 'failed') return { failed: true, error: data.error };
        return { done: false };
      });

      const ichElements = result && result.analysis && Array.isArray(result.analysis.ichElements)
        ? result.analysis.ichElements.join('、')
        : '未返回';

      this.setData({ result, analysisText: ichElements, progress: 100 });
    } catch (error) {
      api.showError(error, '生成失败');
    } finally {
      this.stopProgress();
      this.setData({ loading: false });
    }
  },

  async toggleFavorite() {
    if (!this.data.result || !this.data.result.staticMainImageUrl) {
      wx.showToast({ title: '暂无可收藏内容', icon: 'none' });
      return;
    }
    if (!api.ensureLogin()) return;

    try {
      if (this.data.isFavorited && this.data.favoriteId) {
        const data = await api.request(`/api/v1/favorites/${this.data.favoriteId}`, { method: 'DELETE' });
        if (!data.success) throw new Error(data.message || '取消收藏失败');
        this.setData({ isFavorited: false, favoriteId: '' });
        return;
      }

      const result = this.data.result;
      const data = await api.request('/api/v1/favorites', {
        method: 'POST',
        data: {
          type: 'photo',
          imageUrl: result.staticMainImageUrl,
          title: '非遗创意作品',
          metadata: Object.assign({}, result.analysis || {}, {
            staticSubImageUrl1: result.staticSubImageUrl1,
            staticSubImageUrl2: result.staticSubImageUrl2
          })
        }
      });

      if (!data.success) throw new Error(data.message || '收藏失败');
      this.setData({ isFavorited: true, favoriteId: data.id });
    } catch (error) {
      api.showError(error, '收藏失败');
    }
  },

  previewImage(event) {
    const current = event.currentTarget.dataset.url;
    const result = this.data.result || {};
    const urls = [result.staticMainImageUrl, result.staticSubImageUrl1, result.staticSubImageUrl2].filter(Boolean);
    wx.previewImage({ current, urls });
  },

  goDetail() {
    const result = this.data.result || {};
    const url = `/pages/detail/index?imageUrl=${encodeParam(result.staticMainImageUrl)}&subImageUrl1=${encodeParam(result.staticSubImageUrl1)}&subImageUrl2=${encodeParam(result.staticSubImageUrl2)}&description=${encodeParam(this.data.description)}`;
    wx.navigateTo({ url });
  },

  onShareAppMessage() {
    const result = this.data.result || {};
    return {
      title: '我用智能非遗创作了一幅作品',
      path: `/pages/detail/index?imageUrl=${encodeParam(result.staticMainImageUrl)}&subImageUrl1=${encodeParam(result.staticSubImageUrl1)}&subImageUrl2=${encodeParam(result.staticSubImageUrl2)}`
    };
  }
});
