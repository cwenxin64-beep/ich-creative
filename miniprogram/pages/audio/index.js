const api = require('../../utils/api');
const constants = require('../../utils/constants');
const { encodeParam } = require('../../utils/format');

Page({
  data: {
    prompt: '',
    genres: constants.GENRES,
    moods: constants.MOODS,
    durations: constants.DURATIONS,
    selectedGenre: '',
    selectedMood: '',
    selectedDuration: 30,
    loading: false,
    progress: 0,
    result: null,
    playing: false,
    isFavorited: false,
    favoriteId: ''
  },

  audio: null,
  progressTimer: null,

  onUnload() {
    this.stopProgress();
    this.destroyAudio();
  },

  onPrompt(event) {
    this.setData({ prompt: event.detail.value });
  },

  selectGenre(event) {
    const value = event.currentTarget.dataset.value;
    this.setData({ selectedGenre: this.data.selectedGenre === value ? '' : value });
  },

  selectMood(event) {
    const value = event.currentTarget.dataset.value;
    this.setData({ selectedMood: this.data.selectedMood === value ? '' : value });
  },

  selectDuration(event) {
    this.setData({ selectedDuration: Number(event.currentTarget.dataset.value) });
  },

  startProgress() {
    this.stopProgress();
    this.progressTimer = setInterval(() => {
      if (this.data.progress >= 90) return;
      this.setData({ progress: Math.min(90, this.data.progress + 5) });
    }, 2000);
  },

  stopProgress() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  },

  async generate() {
    let text = this.data.prompt.trim();
    if (!text) {
      const parts = [this.data.selectedGenre, this.data.selectedMood].filter(Boolean);
      text = parts.length ? `一段${parts.join('、')}风格的非遗音乐` : '一段中国传统非遗风格的音乐';
    }

    const genrePart = this.data.selectedGenre ? `，曲风：${this.data.selectedGenre}` : '';
    const moodPart = this.data.selectedMood ? `，情绪：${this.data.selectedMood}` : '';
    const fullPrompt = `${text}${genrePart}${moodPart}，时长${this.data.selectedDuration}秒`;

    this.destroyAudio();
    this.setData({ loading: true, progress: 0, result: null, isFavorited: false, favoriteId: '', playing: false });
    this.startProgress();

    try {
      const data = await api.request('/api/v1/audio/generate', {
        method: 'POST',
        data: {
          prompt: fullPrompt,
          duration: this.data.selectedDuration
        }
      });

      if (!data.success) {
        throw new Error(data.message || data.error || '生成失败');
      }

      this.setData({ result: data, progress: 100 });
    } catch (error) {
      api.showError(error, '生成失败');
    } finally {
      this.stopProgress();
      this.setData({ loading: false });
    }
  },

  getPlayableUrl() {
    const audioUrl = this.data.result && this.data.result.audioUrl;
    if (!audioUrl) return '';
    return api.buildUrl(`/api/v1/audio/proxy?url=${encodeURIComponent(audioUrl)}`);
  },

  togglePlay() {
    const src = this.getPlayableUrl();
    if (!src) return;

    if (!this.audio) {
      this.audio = wx.createInnerAudioContext();
      this.audio.src = src;
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

  destroyAudio() {
    if (this.audio) {
      this.audio.destroy();
      this.audio = null;
    }
  },

  async toggleFavorite() {
    if (!this.data.result || !this.data.result.audioUrl) return;
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
          type: 'music',
          imageUrl: result.audioUrl,
          title: '唱非遗作品',
          metadata: {
            audioUrl: result.audioUrl,
            genre: result.genre || this.data.selectedGenre,
            mood: result.mood || this.data.selectedMood,
            duration: result.duration,
            storageKey: result.storageKey,
            musicId: result.id
          }
        }
      });

      if (!data.success) throw new Error(data.message || '收藏失败');
      this.setData({ isFavorited: true, favoriteId: data.id });
    } catch (error) {
      api.showError(error, '收藏失败');
    }
  },

  goDetail() {
    const result = this.data.result || {};
    wx.navigateTo({
      url: `/pages/detail/index?audioUrl=${encodeParam(this.getPlayableUrl())}&description=${encodeParam(result.captions || '非遗音乐作品')}`
    });
  },

  onShareAppMessage() {
    return {
      title: '我创作了一首非遗风格音乐',
      path: `/pages/detail/index?audioUrl=${encodeParam(this.getPlayableUrl())}`
    };
  }
});
