const api = require('../../utils/api');
const constants = require('../../utils/constants');
const promptTools = require('../../utils/prompt');
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
    optimizing: false,
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

  async optimizeDescription() {
    const prompt = this.data.prompt.trim();
    if (this.data.loading || this.data.optimizing) return;
    if (!prompt && !this.data.selectedGenre && !this.data.selectedMood) {
      wx.showToast({ title: '先写一点描述或选择曲风', icon: 'none' });
      return;
    }

    this.setData({ optimizing: true });
    wx.showLoading({ title: '正在优化' });
    try {
      const data = await promptTools.optimizePrompt('audio', prompt, {
        页面: '唱非遗',
        曲风: this.data.selectedGenre,
        情绪: this.data.selectedMood,
        时长: `${this.data.selectedDuration}秒`
      });
      if (!data.success || !data.optimizedText) {
        throw new Error(data.error || data.message || '优化失败');
      }
      this.setData({ prompt: data.optimizedText });
      wx.hideLoading();
      wx.showToast({ title: '已优化', icon: 'success' });
    } catch (error) {
      wx.hideLoading();
      api.showError(error, '优化失败');
    } finally {
      this.setData({ optimizing: false });
    }
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
    const selectedGenre = this.data.selectedGenre;
    const selectedMood = this.data.selectedMood;
    const selectedDuration = this.data.selectedDuration;
    let text = this.data.prompt.trim();
    if (!text) {
      const parts = [selectedGenre, selectedMood].filter(Boolean);
      text = parts.length ? `一段${parts.join('、')}风格的非遗音乐` : '一段中国传统非遗风格的音乐';
    }

    const genrePart = selectedGenre ? `，曲风：${selectedGenre}` : '';
    const moodPart = selectedMood ? `，情绪：${selectedMood}` : '';
    const fullPrompt = `${text}${genrePart}${moodPart}，时长${selectedDuration}秒`;

    this.destroyAudio();
    this.setData({ loading: true, progress: 0, result: null, isFavorited: false, favoriteId: '', playing: false });
    this.startProgress();

    try {
      const data = await api.request('/api/v1/audio/generate', {
        method: 'POST',
        data: {
          prompt: fullPrompt,
          duration: selectedDuration
        }
      });

      if (!data.success) {
        throw new Error(data.message || data.error || '生成失败');
      }

      const result = Object.assign({}, data, {
        scene: text,
        genre: selectedGenre || data.genre || '',
        mood: selectedMood || data.mood || ''
      });
      this.setData({ result, progress: 100 });
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
    if (/^https?:\/\//i.test(audioUrl)) return audioUrl;
    return api.buildUrl(audioUrl);
  },

  togglePlay() {
    const src = this.getPlayableUrl();
    if (!src) return;

    if (this.data.playing) {
      if (this.audio) this.audio.pause();
      this.setData({ playing: false });
      return;
    }

    if (!this.audio || this.audio.src !== src) {
      this.createAudio(src);
    }

    this.audio.play();
  },

  createAudio(src) {
    this.destroyAudio();
    this.audio = wx.createInnerAudioContext();
    this.audio.obeyMuteSwitch = false;
    this.audio.src = src;
    this.audio.onPlay(() => this.setData({ playing: true }));
    this.audio.onPause(() => this.setData({ playing: false }));
    this.audio.onStop(() => this.setData({ playing: false }));
    this.audio.onEnded(() => this.setData({ playing: false }));
    this.audio.onError((error) => {
      console.warn('[Audio] Playback failed:', error);
      this.setData({ playing: false });
      wx.showToast({ title: '播放失败，请稍后重试', icon: 'none' });
    });
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
      const favoriteTitle = result.scene
        ? `唱非遗·${result.scene.slice(0, 12)}`
        : '唱非遗作品';
      const data = await api.request('/api/v1/favorites', {
        method: 'POST',
        data: {
          type: 'music',
          imageUrl: result.audioUrl,
          title: favoriteTitle,
          metadata: {
            audioUrl: result.audioUrl,
            scene: result.scene,
            genre: result.genre,
            mood: result.mood,
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
    const description = [result.scene, result.genre, result.mood].filter(Boolean).join(' · ') || result.captions || '非遗音乐作品';
    wx.navigateTo({
      url: `/pages/detail/index?audioUrl=${encodeParam(this.getPlayableUrl())}&description=${encodeParam(description)}`
    });
  },

  onShareAppMessage() {
    return {
      title: '我创作了一首非遗风格音乐',
      path: `/pages/detail/index?audioUrl=${encodeParam(this.getPlayableUrl())}`
    };
  }
});
