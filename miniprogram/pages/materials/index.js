const api = require('../../utils/api');
const { normalizeMaterial, encodeParam } = require('../../utils/format');

Page({
  data: {
    materials: [],
    filtered: [],
    filter: 'all',
    loading: false
  },

  onShow() {
    this.fetchMaterials({ silent: true });
  },

  onPullDownRefresh() {
    this.fetchMaterials().finally(() => wx.stopPullDownRefresh());
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  async fetchMaterials(options) {
    const silent = options && options.silent;
    this.setData({ loading: true });
    try {
      const data = await api.request('/api/v1/materials');
      if (!data.success) throw new Error(data.message || '加载失败');
      const materials = (data.materials || []).map(normalizeMaterial);
      this.setData({ materials }, () => this.applyFilter());
    } catch (error) {
      if (silent) {
        console.warn('[Materials] Initial load failed:', error && (error.message || error));
        return;
      }
      api.showError(error, '加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  setFilter(event) {
    this.setData({ filter: event.currentTarget.dataset.filter }, () => this.applyFilter());
  },

  applyFilter() {
    const filtered = this.data.filter === 'all'
      ? this.data.materials
      : this.data.materials.filter((item) => item.type === this.data.filter);
    this.setData({ filtered });
  },

  async syncMaterials() {
    try {
      const data = await api.request('/api/v1/materials/sync', { method: 'POST' });
      if (!data.success) throw new Error(data.message || '同步失败');
      wx.showToast({ title: data.message || '同步成功', icon: 'none' });
      await this.fetchMaterials();
    } catch (error) {
      api.showError(error, '同步失败');
    }
  },

  confirmDelete(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除素材',
      content: '确定删除这个素材吗？',
      confirmText: '删除',
      success: (res) => {
        if (res.confirm) this.deleteMaterial(id);
      }
    });
  },

  async deleteMaterial(id) {
    try {
      const data = await api.request(`/api/v1/materials/${id}`, { method: 'DELETE' });
      if (!data.success) throw new Error(data.message || '删除失败');
      const materials = this.data.materials.filter((item) => item.id !== String(id));
      this.setData({ materials }, () => this.applyFilter());
      wx.showToast({ title: '已删除', icon: 'success' });
    } catch (error) {
      api.showError(error, '删除失败');
    }
  },

  goDetail(event) {
    const item = this.data.filtered[Number(event.currentTarget.dataset.index)];
    if (!item) return;
    const audioUrl = item.type === 'music' ? (item.metadata.audioUrl || item.sourceUrl) : '';
    wx.navigateTo({
      url: `/pages/detail/index?imageUrl=${encodeParam(item.type === 'music' ? '' : item.sourceUrl)}&audioUrl=${encodeParam(audioUrl)}&description=${encodeParam(item.description || item.title)}`
    });
  }
});
