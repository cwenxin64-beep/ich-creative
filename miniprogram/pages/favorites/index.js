const api = require('../../utils/api');
const { normalizeFavorite, dateText, encodeParam } = require('../../utils/format');

Page({
  data: {
    favorites: [],
    loading: false
  },

  onShow() {
    this.fetchFavorites();
  },

  onPullDownRefresh() {
    this.fetchFavorites().finally(() => wx.stopPullDownRefresh());
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  async fetchFavorites() {
    this.setData({ loading: true });
    try {
      const data = await api.request('/api/v1/favorites');
      if (!data.success) throw new Error(data.message || '加载失败');
      const favorites = (data.favorites || []).map((item) => {
        const normalized = normalizeFavorite(item);
        return Object.assign({}, normalized, { dateText: dateText(normalized.createdAt) });
      });
      this.setData({ favorites });
    } catch (error) {
      api.showError(error, '加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  confirmDelete(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除收藏',
      content: '确定删除这个收藏吗？',
      confirmText: '删除',
      success: (res) => {
        if (res.confirm) this.deleteFavorite(id);
      }
    });
  },

  async deleteFavorite(id) {
    try {
      const data = await api.request(`/api/v1/favorites/${id}`, { method: 'DELETE' });
      if (!data.success) throw new Error(data.message || '删除失败');
      this.setData({ favorites: this.data.favorites.filter((item) => item.id !== String(id)) });
      wx.showToast({ title: '已删除', icon: 'success' });
    } catch (error) {
      api.showError(error, '删除失败');
    }
  },

  async syncMaterials() {
    try {
      const data = await api.request('/api/v1/materials/sync', { method: 'POST' });
      if (!data.success) throw new Error(data.message || '同步失败');
      wx.showToast({ title: data.message || '同步成功', icon: 'none' });
    } catch (error) {
      api.showError(error, '同步失败');
    }
  },

  goDetail(event) {
    const item = this.data.favorites[Number(event.currentTarget.dataset.index)];
    if (!item) return;
    wx.navigateTo({
      url: `/pages/detail/index?imageUrl=${encodeParam(item.mainImageUrl)}&videoUrl=${encodeParam(item.videoUrl)}&audioUrl=${encodeParam(item.audioUrl)}&subImageUrl1=${encodeParam(item.subImageUrls[0])}&subImageUrl2=${encodeParam(item.subImageUrls[1])}&description=${encodeParam(item.description || item.title)}`
    });
  },

  onShareAppMessage(event) {
    const index = event && event.target ? Number(event.target.dataset.index) : 0;
    const item = this.data.favorites[index] || {};
    return {
      title: item.title || '非遗作品',
      path: `/pages/detail/index?imageUrl=${encodeParam(item.mainImageUrl)}&audioUrl=${encodeParam(item.audioUrl)}&videoUrl=${encodeParam(item.videoUrl)}`
    };
  }
});
