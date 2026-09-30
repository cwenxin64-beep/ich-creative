const api = require('../../utils/api');

Page({
  data: {
    email: '',
    code: '',
    newPassword: '',
    codeSent: false,
    sending: false,
    resetting: false
  },

  onEmail(event) {
    this.setData({ email: event.detail.value });
  },

  onCode(event) {
    this.setData({ code: event.detail.value });
  },

  onNewPassword(event) {
    this.setData({ newPassword: event.detail.value });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/login/index' }) });
  },

  goLogin() {
    wx.redirectTo({ url: '/pages/login/index' });
  },

  async requestCode() {
    const email = this.data.email.trim();
    if (!email) {
      wx.showToast({ title: '请输入注册邮箱', icon: 'none' });
      return;
    }

    this.setData({ sending: true });
    try {
      const data = await api.request('/api/v1/auth/password-reset/request', {
        method: 'POST',
        data: { email }
      });
      this.setData({ codeSent: true });
      wx.showToast({ title: data.message || '验证码已发送', icon: 'none' });
    } catch (error) {
      api.showError(error, '发送验证码失败');
    } finally {
      this.setData({ sending: false });
    }
  },

  async resetPassword() {
    const email = this.data.email.trim();
    const code = this.data.code.trim();
    const newPassword = this.data.newPassword;
    if (!/^\d{6}$/.test(code) || newPassword.length < 6) {
      wx.showToast({ title: '请填写6位验证码和新密码', icon: 'none' });
      return;
    }

    this.setData({ resetting: true });
    try {
      const data = await api.request('/api/v1/auth/password-reset/confirm', {
        method: 'POST',
        data: { email, code, newPassword }
      });
      wx.showToast({ title: data.message || '密码已重置', icon: 'success' });
      setTimeout(() => wx.redirectTo({ url: '/pages/login/index' }), 800);
    } catch (error) {
      api.showError(error, '重置密码失败');
    } finally {
      this.setData({ resetting: false });
    }
  }
});
