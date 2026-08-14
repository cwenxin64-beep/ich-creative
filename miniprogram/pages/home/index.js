const api = require('../../utils/api');

Page({
  data: {
    user: null,
    isAuthenticated: false,
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
        description: '文字输入生成海报、卡片、数字人',
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

    this.setData({
      user,
      isAuthenticated,
      avatarText: isAuthenticated ? '已' : '未',
      userName: isAuthenticated ? (user.username || user.name || '已登录') : '未登录',
      userDesc: isAuthenticated ? (user.email || '点击退出登录') : '点击登录/注册'
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
