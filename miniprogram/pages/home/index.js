const api = require('../../utils/api');

Page({
  data: {
    user: null,
    isAuthenticated: false,
    avatarUrl: '',
    avatarUploading: false,
    avatarText: '未',
    userName: '未登录',
    userDesc: '点击登录/注册',
    features: [
      {
        id: 'photo',
        title: '拍非遗',
        subtitle: '视觉创作',
        icon: '拍',
        color: '#B8860B',
        bg: 'rgba(184, 134, 11, 0.12)',
        description: '拍照或上传图片，生成创意非遗产品',
        url: '/pages/photo/index'
      },
      {
        id: 'audio',
        title: '唱非遗',
        subtitle: '音乐创作',
        icon: '唱',
        color: '#D4A574',
        bg: 'rgba(212, 165, 116, 0.16)',
        description: '输入创意或歌词，生成非遗风格音乐',
        url: '/pages/audio/index'
      },
      {
        id: 'play',
        title: '玩非遗',
        subtitle: '交互创作',
        icon: '玩',
        color: '#7BA05B',
        bg: 'rgba(123, 160, 91, 0.16)',
        description: '文字输入生成海报、节日卡、生日卡',
        url: '/pages/play/index'
      },
      {
        id: 'use',
        title: '创非遗',
        subtitle: '定制设计',
        icon: '创',
        color: '#C75B5B',
        bg: 'rgba(199, 91, 91, 0.14)',
        description: '个性化定制非遗创意产品',
        url: '/pages/use/index'
      }
    ]
  },

  onShow() {
    const user = api.getUser() || {};
    const isAuthenticated = api.isAuthenticated();
    const userName = isAuthenticated ? (user.username || user.name || '已登录') : '未登录';

    this.setData({
      user,
      isAuthenticated,
      avatarUrl: isAuthenticated ? (user.avatar || user.avatarUrl || '') : '',
      avatarText: isAuthenticated ? userName.slice(0, 1) : '未',
      userName,
      userDesc: isAuthenticated ? (user.email || '点击退出登录') : '点击登录/注册'
    });
  },

  chooseAvatar() {
    if (!this.data.isAuthenticated) {
      wx.navigateTo({ url: '/pages/welcome/index' });
      return;
    }

    if (this.data.avatarUploading) return;

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) return;

        this.setData({ avatarUploading: true });
        wx.showLoading({ title: '上传头像' });
        try {
          const data = await api.upload('/api/v1/auth/avatar', file.tempFilePath);
          if (!data.success || !data.user) {
            throw new Error(data.error || data.message || '上传头像失败');
          }

          api.saveUser(data.user);
          this.setData({
            user: data.user,
            avatarUrl: data.user.avatar || '',
            userName: data.user.username || '已登录',
            userDesc: data.user.email || '点击退出登录',
            avatarText: (data.user.username || '已').slice(0, 1)
          });
          wx.hideLoading();
          wx.showToast({ title: '头像已更新', icon: 'success' });
        } catch (error) {
          wx.hideLoading();
          api.showError(error, '上传头像失败');
        } finally {
          this.setData({ avatarUploading: false });
        }
      }
    });
  },

  handleUserTap() {
    if (!this.data.isAuthenticated) {
      wx.navigateTo({ url: '/pages/welcome/index' });
      return;
    }

    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmText: '退出',
      success(res) {
        if (res.confirm) {
          api.clearAuth();
          wx.navigateTo({ url: '/pages/welcome/index' });
        }
      }
    });
  },

  goPage(event) {
    const url = event.currentTarget.dataset.url;
    if (['/pages/photo/index', '/pages/audio/index', '/pages/play/index', '/pages/use/index'].includes(url)) {
      wx.switchTab({ url });
      return;
    }
    wx.navigateTo({ url });
  }
});
