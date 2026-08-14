Page({
  onLoad() {
    wx.switchTab({
      url: '/pages/home/index',
      fail() {
        wx.reLaunch({ url: '/pages/home/index' });
      }
    });
  }
});
