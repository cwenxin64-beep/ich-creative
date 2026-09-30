const api = require('../../utils/api');

Page({
  data: {
    user: {},
    currentPassword: '',
    unbinding: false
  },

  onShow() {
    if (!api.ensureLogin()) return;
    this.setData({ user: api.getUser() || {} });
  },

  onPassword(event) {
    this.setData({ currentPassword: event.detail.value });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  confirmUnbind() {
    if (!this.data.currentPassword) {
      wx.showToast({ title: '请输入当前密码', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认解绑邮箱',
      content: `解绑后请使用用户名“${this.data.user.username}”登录，并且无法通过邮箱找回密码。`,
      confirmText: '确认解绑',
      confirmColor: '#c75b5b',
      success: (result) => {
        if (result.confirm) this.unbindEmail();
      }
    });
  },

  async unbindEmail() {
    this.setData({ unbinding: true });
    try {
      const data = await api.request('/api/v1/auth/email/unbind', {
        method: 'POST',
        data: { currentPassword: this.data.currentPassword }
      });
      if (!data.success || !data.user) throw new Error(data.error || '解绑失败');
      api.saveUser(data.user);
      this.setData({ user: data.user, currentPassword: '' });
      wx.showToast({ title: '邮箱已解绑', icon: 'success' });
    } catch (error) {
      api.showError(error, '解绑邮箱失败');
    } finally {
      this.setData({ unbinding: false });
    }
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmText: '退出',
      success(result) {
        if (!result.confirm) return;
        api.clearAuth();
        wx.reLaunch({ url: '/pages/welcome/index' });
      }
    });
  }
});
