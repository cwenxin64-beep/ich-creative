const api = require('../../utils/api');
const { encodeParam } = require('../../utils/format');

Page({
  data: {
    loading: false,
    imageUrl: '',
    videoUrl: '',
    audioUrl: '',
    description: '',
    subImages: [],
    playing: false
  },

  audio: null,

  onLoad(options) {
    if (options.shareId) {
      this.loadShare(options.shareId);
      return;
    }

    this.setData({
      imageUrl: decodeURIComponent(options.imageUrl || ''),
      videoUrl: decodeURIComponent(options.videoUrl || ''),
      audioUrl: decodeURIComponent(options.audioUrl || ''),
      description: decodeURIComponent(options.description || ''),
      subImages: [options.subImageUrl1, options.subImageUrl2].map((item) => decodeURIComponent(item || '')).filter(Boolean)
    });
  },

  onUnload() {
    if (this.audio) {
      this.audio.destroy();
      this.audio = null;
    }
  },

  async loadShare(shareId) {
    this.setData({ loading: true });
    try {
      const data = await api.request(`/api/v1/share/${shareId}`);
      const payload = data.data || {};
      this.setData({
        imageUrl: payload.mainImageUrl || payload.imageUrl || '',
        videoUrl: payload.videoUrl || '',
        audioUrl: payload.audioUrl || '',
        description: payload.description || payload.title || '',
        subImages: payload.subImageUrls || []
      });
    } catch (error) {
      api.showError(error, '加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  previewImage(event) {
    if (!this.data.imageUrl) return;
    const current = event && event.currentTarget && event.currentTarget.dataset.url
      ? event.currentTarget.dataset.url
      : this.data.imageUrl;
    wx.previewImage({
      current,
      urls: [this.data.imageUrl].concat(this.data.subImages).filter(Boolean)
    });
  },

  togglePlay() {
    if (!this.data.audioUrl) return;
    if (!this.audio) {
      this.audio = wx.createInnerAudioContext();
      this.audio.src = this.data.audioUrl;
      this.audio.onEnded(() => this.setData({ playing: false }));
      this.audio.onError(() => {
        this.setData({ playing: false });
        wx.showToast({ title: '播放失败', icon: 'none' });
      });
    }

    if (this.data.playing) {
      this.audio.pause();
      this.setData({ playing: false });
      return;
    }

    this.audio.play();
    this.setData({ playing: true });
  },

  onShareAppMessage() {
    return {
      title: this.data.description || '非遗作品',
      path: `/pages/detail/index?imageUrl=${encodeParam(this.data.imageUrl)}&videoUrl=${encodeParam(this.data.videoUrl)}&audioUrl=${encodeParam(this.data.audioUrl)}&description=${encodeParam(this.data.description)}`
    };
  }
});
