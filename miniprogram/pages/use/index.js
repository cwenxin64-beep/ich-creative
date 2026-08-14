const api = require('../../utils/api');
const constants = require('../../utils/constants');
const { encodeParam } = require('../../utils/format');

const CATEGORY_NAMES = {
  fashion: '时尚配饰',
  home: '家居装饰',
  art: '艺术品',
  gifts: '礼品'
};

const PAYMENT_STATUS_NAMES = {
  unpaid: '未支付',
  pending: '待支付',
  paid: '已支付',
  refunded: '已退款'
};

function isCraftsmanRole(role) {
  return role === 'craftsman' || role === 'artisan';
}

function formatOrder(order) {
  const contactLine = [order.contactPhone, order.contactWechat].filter(Boolean).join(' / ');
  return Object.assign({}, order, {
    budgetText: order.budgetAmount ? `预算 ${order.budgetAmount} 元` : '预算面议',
    contactLine: contactLine || '未填写联系方式',
    createdLabel: order.createdAt ? String(order.createdAt).slice(0, 10) : '',
    statusText: order.statusText || '待接单',
    paymentStatusText: PAYMENT_STATUS_NAMES[order.paymentStatus] || '未支付'
  });
}

Page({
  data: {
    ichTypes: constants.ICH_TYPES,
    useInteractions: constants.USE_INTERACTIONS,
    scenes: constants.APPLICATION_SCENES,
    selectedIchType: '',
    selectedInteractionType: '',
    selectedScene: '',
    keywords: '',
    loading: false,
    progress: 0,
    results: [],
    isCraftsman: false,
    ordersLoading: false,
    orderSubmitting: false,
    acceptingOrderId: '',
    showOrderForm: false,
    orderForm: {
      title: '',
      contactName: '',
      contactPhone: '',
      contactWechat: '',
      requirements: '',
      budgetAmount: ''
    },
    myOrders: [],
    availableOrders: [],
    acceptedOrders: []
  },

  progressTimer: null,

  onShow() {
    const user = api.getUser() || {};
    const isCraftsman = isCraftsmanRole(user.role);
    this.setData({ isCraftsman });

    if (api.isAuthenticated()) {
      this.loadOrders();
      return;
    }

    this.setData({
      myOrders: [],
      availableOrders: [],
      acceptedOrders: []
    });
  },

  onUnload() {
    this.stopProgress();
  },

  onKeywords(event) {
    this.setData({ keywords: event.detail.value });
  },

  onOrderInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`orderForm.${field}`]: event.detail.value });
  },

  selectIch(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({ selectedIchType: this.data.selectedIchType === id ? '' : id });
  },

  selectInteraction(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({ selectedInteractionType: this.data.selectedInteractionType === id ? '' : id });
  },

  selectScene(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({ selectedScene: this.data.selectedScene === id ? '' : id });
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

  buildDefaultKeywords() {
    const ichName = (constants.ICH_TYPES.find((item) => item.id === this.data.selectedIchType) || {}).name || '';
    const interactionName = (constants.USE_INTERACTIONS.find((item) => item.id === this.data.selectedInteractionType) || {}).name || '';
    const sceneName = (constants.APPLICATION_SCENES.find((item) => item.id === this.data.selectedScene) || {}).name || '';
    const parts = [];
    if (ichName) parts.push(`结合「${ichName}」`);
    if (interactionName) parts.push(`面向${interactionName}`);
    if (sceneName) parts.push(`应用于${sceneName}`);
    return parts.length ? `${parts.join('，')}，展现非遗文化的现代化表达。` : '一件非遗创意定制作品。';
  },

  async loadOrders() {
    this.setData({ ordersLoading: true });
    try {
      const data = await api.request('/api/v1/use/customization-orders');
      const orders = (data.orders || []).map(formatOrder);

      if (this.data.isCraftsman) {
        this.setData({
          availableOrders: orders.filter((item) => item.status === 'pending'),
          acceptedOrders: orders.filter((item) => item.status !== 'pending')
        });
        return;
      }

      this.setData({ myOrders: orders });
    } catch (error) {
      api.showError(error, '获取需求单失败');
    } finally {
      this.setData({ ordersLoading: false });
    }
  },

  toggleOrderForm() {
    if (!api.ensureLogin()) return;

    if (this.data.isCraftsman) {
      wx.showToast({ title: '手艺人账号用于接单', icon: 'none' });
      return;
    }

    this.setData({ showOrderForm: !this.data.showOrderForm });
  },

  resetOrderForm() {
    this.setData({
      showOrderForm: false,
      orderForm: {
        title: '',
        contactName: '',
        contactPhone: '',
        contactWechat: '',
        requirements: '',
        budgetAmount: ''
      }
    });
  },

  async submitOrder() {
    if (!api.ensureLogin()) return;

    const form = this.data.orderForm;
    const requirements = form.requirements.trim() || this.data.keywords.trim();
    const contactName = form.contactName.trim();
    const contactPhone = form.contactPhone.trim();
    const contactWechat = form.contactWechat.trim();

    if (!requirements) {
      wx.showToast({ title: '请填写定制需求', icon: 'none' });
      return;
    }

    if (!contactName || (!contactPhone && !contactWechat)) {
      wx.showToast({ title: '请填写联系人和联系方式', icon: 'none' });
      return;
    }

    this.setData({ orderSubmitting: true });
    try {
      const data = await api.request('/api/v1/use/customization-order', {
        method: 'POST',
        data: {
          title: form.title.trim() || '非遗定制需求',
          contactName,
          contactPhone,
          contactWechat,
          ichType: this.data.selectedIchType,
          interactionType: this.data.selectedInteractionType,
          applicationScene: this.data.selectedScene,
          keywords: this.data.keywords.trim(),
          requirements,
          budgetAmount: form.budgetAmount
        }
      });

      if (!data.success) {
        throw new Error(data.error || '提交失败');
      }

      wx.showToast({ title: '已提交', icon: 'success' });
      this.resetOrderForm();
      this.loadOrders();
    } catch (error) {
      api.showError(error, '提交失败');
    } finally {
      this.setData({ orderSubmitting: false });
    }
  },

  async acceptOrder(event) {
    const orderId = Number(event.currentTarget.dataset.id);
    if (!orderId) return;

    this.setData({ acceptingOrderId: String(orderId) });
    try {
      const data = await api.request(`/api/v1/use/customization-orders/${orderId}/accept`, {
        method: 'POST'
      });

      if (!data.success) {
        throw new Error(data.error || '接单失败');
      }

      wx.showToast({ title: '接单成功', icon: 'success' });
      this.loadOrders();
    } catch (error) {
      api.showError(error, '接单失败');
    } finally {
      this.setData({ acceptingOrderId: '' });
    }
  },

  async generate() {
    if (!this.data.selectedIchType && !this.data.keywords.trim()) {
      wx.showToast({ title: '请选择非遗类型或输入关键词', icon: 'none' });
      return;
    }

    const keywords = this.data.keywords.trim() || this.buildDefaultKeywords();
    this.setData({ loading: true, progress: 0, results: [] });
    this.startProgress();

    try {
      const created = await api.request('/api/v1/use/customize', {
        method: 'POST',
        data: {
          keywords,
          ichType: this.data.selectedIchType,
          interactionType: this.data.selectedInteractionType,
          applicationScene: this.data.selectedScene
        }
      });

      if (!created.taskId) {
        throw new Error(created.error || '创建任务失败');
      }

      const result = await api.poll(`/api/v1/use/status/${created.taskId}`, (data) => {
        if (data.status === 'completed') return { done: true, value: data.result };
        if (data.status === 'failed') return { failed: true, error: data.error };
        return { done: false };
      });

      if (!result.success) {
        throw new Error(result.message || '生成失败');
      }

      const results = (result.results || []).map((item, index) => Object.assign({}, item, {
        localId: `${Date.now()}-${index}`,
        categoryText: CATEGORY_NAMES[item.category] || item.category || '非遗作品',
        favorited: false,
        favoriteId: ''
      }));

      this.setData({ results, progress: 100 });
    } catch (error) {
      api.showError(error, '生成失败');
    } finally {
      this.stopProgress();
      this.setData({ loading: false });
    }
  },

  async toggleFavorite(event) {
    const index = Number(event.currentTarget.dataset.index);
    const result = this.data.results[index];
    if (!result || !result.mainImageUrl) return;
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
          type: 'use',
          imageUrl: result.mainImageUrl,
          title: result.categoryText || '非遗定制作品',
          metadata: {
            subImageUrl1: result.subImageUrl1,
            subImageUrl2: result.subImageUrl2,
            creativeDescription: result.creativeDescription || this.data.keywords
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
    wx.navigateTo({
      url: `/pages/detail/index?imageUrl=${encodeParam(item.mainImageUrl)}&subImageUrl1=${encodeParam(item.subImageUrl1)}&subImageUrl2=${encodeParam(item.subImageUrl2)}&description=${encodeParam(item.creativeDescription || this.data.keywords)}`
    });
  },

  onShareAppMessage(event) {
    const index = event && event.target ? Number(event.target.dataset.index) : 0;
    const item = this.data.results[index] || {};
    return {
      title: `我定制了${item.categoryText || '非遗'}作品`,
      path: `/pages/detail/index?imageUrl=${encodeParam(item.mainImageUrl)}`
    };
  }
});
