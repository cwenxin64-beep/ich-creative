const API_BASE_URL = 'https://cc-4gicfmjy884d01bf-1388119917.ap-shanghai.app.tcloudbase.com';
const SERVICE_NAME = 'ich-server';
const TOKEN_KEY = 'auth_access_token';
const REFRESH_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

function buildUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

function request(path, options = {}) {
  const token = getToken();
  const header = Object.assign({}, options.header || {});

  if (options.json !== false) {
    header['Content-Type'] = header['Content-Type'] || 'application/json';
  }

  if (token) {
    header.Authorization = `Bearer ${token}`;
  }
  header['X-WX-SERVICE'] = SERVICE_NAME;

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(path),
      method: options.method || 'GET',
      data: options.data,
      header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(new Error((res.data && (res.data.message || res.data.error)) || `请求失败：${res.statusCode}`));
      },
      fail(error) {
        reject(new Error(error.errMsg || '网络请求失败'));
      }
    });
  });
}

function upload(path, filePath, formData = {}) {
  const token = getToken();
  const header = {
    'X-WX-SERVICE': SERVICE_NAME
  };

  if (token) {
    header.Authorization = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: buildUrl(path),
      filePath,
      name: 'file',
      formData,
      header,
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`上传失败：${res.statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(res.data));
        } catch (error) {
          reject(new Error('服务端返回格式错误'));
        }
      },
      fail(error) {
        reject(new Error(error.errMsg || '上传失败'));
      }
    });
  });
}

function saveAuth(data) {
  wx.setStorageSync(TOKEN_KEY, data.accessToken);
  wx.setStorageSync(REFRESH_KEY, data.refreshToken);
  wx.setStorageSync(USER_KEY, data.user);
}

function clearAuth() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(REFRESH_KEY);
  wx.removeStorageSync(USER_KEY);
}

function getUser() {
  return wx.getStorageSync(USER_KEY) || null;
}

function isAuthenticated() {
  return Boolean(getUser() && getToken());
}

function ensureLogin() {
  if (isAuthenticated()) {
    return true;
  }

  wx.showModal({
    title: '需要登录',
    content: '登录后才能继续使用这个功能。',
    confirmText: '去登录',
    success(res) {
      if (res.confirm) {
        wx.navigateTo({ url: '/pages/welcome/index' });
      }
    }
  });
  return false;
}

function showError(error, title = '操作失败') {
  wx.showToast({
    title: error && error.message ? error.message : title,
    icon: 'none',
    duration: 2200
  });
}

function poll(path, checkDone, options = {}) {
  const interval = options.interval || 2000;
  const maxAttempts = options.maxAttempts || 120;
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const data = await request(path);
        const result = checkDone(data);
        if (result.done) {
          resolve(result.value);
          return;
        }
        if (result.failed) {
          reject(new Error(result.error || '生成失败'));
          return;
        }
        attempts += 1;
        if (attempts >= maxAttempts) {
          reject(new Error('生成时间过长，请稍后重试'));
          return;
        }
        setTimeout(tick, interval);
      } catch (error) {
        attempts += 1;
        if (attempts >= maxAttempts) {
          reject(error);
          return;
        }
        setTimeout(tick, interval);
      }
    };

    tick();
  });
}

module.exports = {
  API_BASE_URL,
  SERVICE_NAME,
  buildUrl,
  request,
  upload,
  saveAuth,
  clearAuth,
  getUser,
  getToken,
  isAuthenticated,
  ensureLogin,
  showError,
  poll
};
