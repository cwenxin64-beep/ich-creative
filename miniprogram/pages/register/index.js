const api = require('../../utils/api');

Page({
  data: {
    username: '',
    email: '',
    password: '',
    loading: false
  },

  onUsername(event) {
    this.setData({ username: event.detail.value });
  },

  onEmail(event) {
    this.setData({ email: event.detail.value });
  },

  onPassword(event) {
    this.setData({ password: event.detail.value });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  goLogin() {
    wx.redirectTo({ url: '/pages/login/index' });
  },

  goArtisan() {
    wx.navigateTo({ url: '/pages/artisan-register/index' });
  },

  async submit() {
    const username = this.data.username.trim();
    const email = this.data.email.trim();
    const password = this.data.password;

    if (!username || !email || password.length < 6) {
      wx.showToast({ title: '请完整填写信息', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const data = await api.request('/api/v1/auth/register', {
        method: 'POST',
        data: { username, email, password }
      });

      if (!data.success) {
        throw new Error(data.error || '注册失败');
      }

      api.saveAuth(data);
      wx.switchTab({ url: '/pages/home/index' });
    } catch (error) {
      api.showError(error, '注册失败');
    } finally {
      this.setData({ loading: false });
    }
  }
});
