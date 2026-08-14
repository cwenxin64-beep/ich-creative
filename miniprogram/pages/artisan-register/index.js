const api = require('../../utils/api');

Page({
  data: {
    name: '',
    email: '',
    password: '',
    contact: '',
    craft: '',
    description: '',
    loading: false
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [field]: event.detail.value });
  },

  goBack() {
    wx.navigateBack();
  },

  async submit() {
    const { name, email, password, contact, craft, description } = this.data;
    if (!name.trim() || !email.trim() || password.length < 6 || !contact.trim() || !craft.trim()) {
      wx.showToast({ title: '请完整填写注册信息', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    try {
      const data = await api.request('/api/v1/auth/register', {
        method: 'POST',
        data: {
          username: name.trim(),
          email: email.trim(),
          password,
          role: 'craftsman',
          artisanName: name.trim(),
          artisanContact: contact.trim(),
          artisanCraft: craft.trim(),
          artisanDescription: description.trim()
        }
      });

      if (!data.success) {
        throw new Error(data.error || data.message || '注册失败');
      }

      api.saveAuth(data);
      wx.showToast({ title: '注册成功', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/use/index' }), 600);
    } catch (error) {
      api.showError(error, '注册失败');
    } finally {
      this.setData({ loading: false });
    }
  }
});
