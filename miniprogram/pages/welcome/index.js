Page({
  goRegister() {
    wx.navigateTo({ url: '/pages/register/index' });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/index' });
  }
});
