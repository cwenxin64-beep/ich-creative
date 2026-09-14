const api = require('../../utils/api');
const constants = require('../../utils/constants');
const { encodeParam } = require('../../utils/format');

const PLAY_ACTIVE_TASK_KEY = 'play_active_task';

Page({
  data: {
    ichTypes: constants.ICH_TYPES,
    productTypes: constants.PRODUCT_TYPES,
    markets: constants.TARGET_MARKETS,
    selectedIchType: '',
    selectedProductType: '',
    selectedMarket: '',
    text: '',
    loading: false,
    progress: 0,
    activeTaskId: '',
    results: []
  },

  progressTimer: null,
  pollTimer: null,
  pollingTaskId: '',
  taskStatusFailures: 0,
  pageVisible: false,

  onShow() {
    this.pageVisible = true;
    this.resumeActiveTask();
  },

  onHide() {
    this.pageVisible = false;
    this.stopProgress();
    this.clearPollTimer();
    this.pollingTaskId = '';
  },

  onUnload() {
    this.pageVisible = false;
    this.stopProgress();
    this.clearPollTimer();
    this.pollingTaskId = '';
  },

  onText(event) {
    this.setData({ text: event.detail.value });
  },

  selectIch(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({ selectedIchType: this.data.selectedIchType === id ? '' : id });
  },

  selectProduct(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({ selectedProductType: this.data.selectedProductType === id ? '' : id });
  },

  selectMarket(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({ selectedMarket: this.data.selectedMarket === id ? '' : id });
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

  clearPollTimer() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  },

  saveActiveTask(task) {
    wx.setStorageSync(PLAY_ACTIVE_TASK_KEY, task);
  },

  getActiveTask() {
    return wx.getStorageSync(PLAY_ACTIVE_TASK_KEY) || null;
  },

  clearActiveTask(taskId) {
    const activeTask = this.getActiveTask();
    if (!activeTask || !activeTask.taskId || !taskId || activeTask.taskId === taskId) {
      wx.removeStorageSync(PLAY_ACTIVE_TASK_KEY);
    }
  },

  resumeActiveTask() {
    const activeTask = this.getActiveTask();
    if (!activeTask || !activeTask.taskId) return;

    this.setData({
      loading: true,
      activeTaskId: activeTask.taskId,
      progress: Math.max(this.data.progress, 10),
      text: activeTask.text || this.data.text,
      selectedIchType: activeTask.ichType || this.data.selectedIchType,
      selectedProductType: activeTask.productType || this.data.selectedProductType,
      selectedMarket: activeTask.targetMarket || this.data.selectedMarket,
      results: []
    });
    this.taskStatusFailures = 0;
    this.startProgress();
    this.pollTaskStatus(activeTask.taskId, 0);
  },

  pollTaskStatus(taskId, delay) {
    if (!taskId || !this.pageVisible) return;
    this.pollingTaskId = taskId;
    this.clearPollTimer();
    this.pollTimer = setTimeout(() => {
      this.fetchTaskStatus(taskId);
    }, delay == null ? 2000 : delay);
  },

  async fetchTaskStatus(taskId) {
    if (!this.pageVisible || this.pollingTaskId !== taskId) return;

    try {
      const data = await api.request(`/api/v1/play/status/${taskId}`);
      if (!this.pageVisible || this.pollingTaskId !== taskId) return;

      this.taskStatusFailures = 0;

      if (data.status === 'completed') {
        if (!data.result || !data.result.success) {
          this.failActiveTask(taskId, new Error((data.result && data.result.message) || '生成失败'));
          return;
        }
        this.completeTask(taskId, data.result);
        return;
      }

      if (data.status === 'failed') {
        this.failActiveTask(taskId, new Error(data.error || '生成失败'));
        return;
      }

      const serverProgress = Number(data.progress || 0);
      this.setData({
        loading: true,
        activeTaskId: taskId,
        progress: Math.min(95, Math.max(this.data.progress, serverProgress))
      });
      this.pollTaskStatus(taskId, 2000);
    } catch (error) {
      if (!this.pageVisible || this.pollingTaskId !== taskId) return;

      this.taskStatusFailures += 1;
      if (this.taskStatusFailures < 5) {
        this.pollTaskStatus(taskId, 3000);
        return;
      }

      this.failActiveTask(taskId, error);
    }
  },

  completeTask(taskId, result) {
    const results = (result.results || []).map((item, index) => {
      const mainImageUrl = item.mainImageUrl || item.imageUrl || (item.videoUrl ? `${item.videoUrl}?type=cover` : '');
      return Object.assign({}, item, {
        localId: `${Date.now()}-${index}`,
        mainImageUrl,
        subImageUrl1: item.subImageUrl1 || mainImageUrl,
        subImageUrl2: item.subImageUrl2 || mainImageUrl,
        favorited: false,
        favoriteId: ''
      });
    });

    this.clearActiveTask(taskId);
    this.clearPollTimer();
    this.pollingTaskId = '';
    this.stopProgress();
    this.setData({ results, progress: 100, loading: false, activeTaskId: '' });
  },

  failActiveTask(taskId, error) {
    this.clearActiveTask(taskId);
    this.clearPollTimer();
    this.pollingTaskId = '';
    this.stopProgress();
    this.setData({ loading: false, activeTaskId: '' });
    api.showError(error, '生成失败');
  },

  buildDefaultText() {
    const ichName = (constants.ICH_TYPES.find((item) => item.id === this.data.selectedIchType) || {}).name || '';
    const productName = (constants.PRODUCT_TYPES.find((item) => item.id === this.data.selectedProductType) || {}).name || '';
    const marketName = (constants.TARGET_MARKETS.find((item) => item.id === this.data.selectedMarket) || {}).name || '';

    const parts = [];
    if (ichName) parts.push(`基于「${ichName}」`);
    if (productName) parts.push(`设计一款${productName}`);
    if (marketName) parts.push(`面向${marketName}市场`);

    return parts.length ? `${parts.join('，')}，突出非遗文化特色与现代审美的融合。` : '创作一件非遗创意作品。';
  },

  async generate() {
    if (!this.data.selectedIchType && !this.data.text.trim()) {
      wx.showToast({ title: '请选择非遗类型或输入描述', icon: 'none' });
      return;
    }

    const text = this.data.text.trim() || this.buildDefaultText();
    this.clearPollTimer();
    this.pollingTaskId = '';
    this.taskStatusFailures = 0;
    this.setData({ loading: true, progress: 0, activeTaskId: '', results: [] });
    this.startProgress();

    try {
      const created = await api.request('/api/v1/play/generate', {
        method: 'POST',
        data: {
          text,
          ichType: this.data.selectedIchType,
          productType: this.data.selectedProductType,
          targetMarket: this.data.selectedMarket
        }
      });

      if (!created.taskId) {
        throw new Error(created.error || '创建任务失败');
      }

      this.saveActiveTask({
        taskId: created.taskId,
        text,
        ichType: this.data.selectedIchType,
        productType: this.data.selectedProductType,
        targetMarket: this.data.selectedMarket,
        createdAt: Date.now()
      });
      if (!this.pageVisible) return;
      this.setData({ activeTaskId: created.taskId, progress: Math.max(this.data.progress, 10) });
      this.pollTaskStatus(created.taskId, 0);
    } catch (error) {
      this.clearActiveTask();
      this.clearPollTimer();
      this.pollingTaskId = '';
      this.stopProgress();
      this.setData({ loading: false, activeTaskId: '' });
      api.showError(error, '生成失败');
    }
  },

  async toggleFavorite(event) {
    const index = Number(event.currentTarget.dataset.index);
    const result = this.data.results[index];
    if (!result) return;
    if (!api.ensureLogin()) return;

    try {
      if (result.favorited && result.favoriteId) {
        const data = await api.request(`/api/v1/favorites/${result.favoriteId}`, { method: 'DELETE' });
        if (!data.success) throw new Error(data.message || '取消收藏失败');
        this.updateResult(index, { favorited: false, favoriteId: '' });
        return;
      }

      const data = await api.request('/api/v1/favorites', {
        method: 'POST',
        data: {
          type: 'play',
          imageUrl: result.mainImageUrl || result.imageUrl,
          videoUrl: result.videoUrl,
          title: result.type || '非遗交互作品',
          metadata: {
            subImageUrl1: result.subImageUrl1,
            subImageUrl2: result.subImageUrl2,
            creativeDescription: result.creativeDescription || this.data.text
          }
        }
      });

      if (!data.success) throw new Error(data.message || '收藏失败');
      this.updateResult(index, { favorited: true, favoriteId: data.id });
    } catch (error) {
      api.showError(error, '收藏失败');
    }
  },

  updateResult(index, patch) {
    const results = this.data.results.slice();
    results[index] = Object.assign({}, results[index], patch);
    this.setData({ results });
  },

  previewImage(event) {
    const current = event.currentTarget.dataset.url;
    const urls = this.data.results
      .flatMap((item) => [item.mainImageUrl, item.subImageUrl1, item.subImageUrl2])
      .filter(Boolean);
    wx.previewImage({ current, urls });
  },

  goDetail(event) {
    const item = this.data.results[Number(event.currentTarget.dataset.index)] || {};
    const url = `/pages/detail/index?imageUrl=${encodeParam(item.mainImageUrl)}&videoUrl=${encodeParam(item.videoUrl)}&subImageUrl1=${encodeParam(item.subImageUrl1)}&subImageUrl2=${encodeParam(item.subImageUrl2)}&description=${encodeParam(item.creativeDescription || this.data.text)}`;
    wx.navigateTo({ url });
  },

  onShareAppMessage(event) {
    const index = event && event.target ? Number(event.target.dataset.index) : 0;
    const item = this.data.results[index] || {};
    return {
      title: `我创造了一个${item.type || '非遗'}作品`,
      path: `/pages/detail/index?imageUrl=${encodeParam(item.mainImageUrl)}&videoUrl=${encodeParam(item.videoUrl)}`
    };
  }
});
