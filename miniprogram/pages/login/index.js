const api = require('../../utils/api');

Page({
  data: {
    email: '',
    password: '',
    loading: false
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

  goRegister() {
    wx.redirectTo({ url: '/pages/register/index' });
  },

  async submit() {
    const email = this.data.email.trim();
    const password = this.data.password;

    if (!email || !password) {
      wx.showToast({ title: '请填写邮箱和密码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const data = await api.request('/api/v1/auth/login', {
        method: 'POST',
        data: { email, password }
      });

      if (!data.success) {
        throw new Error(data.error || '登录失败');
      }

      api.saveAuth(data);
      wx.switchTab({ url: '/pages/home/index' });
    } catch (error) {
      api.showError(error, '登录失败');
    } finally {
      this.setData({ loading: false });
    }
  }
});
