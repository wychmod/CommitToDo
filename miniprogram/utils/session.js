'use strict';

const session = (() => {
  const KEY = 'committo.mp.session';

  function read() {
    try {
      const row = wx.getStorageSync(KEY);
      return row && row.ownerId ? row : null;
    } catch (error) {
      return null;
    }
  }

  function save(account) {
    const row = { email: account.email || '', ownerId: account.ownerId || '', savedAt: Date.now() };
    try {
      wx.setStorageSync(KEY, row);
    } catch (error) {
      // 存储不可用时仍允许本次会话继续阅读。
    }
    return row;
  }

  function clear() {
    try {
      wx.removeStorageSync(KEY);
    } catch (error) {
      // 忽略：下次进入登录页会重新判定。
    }
  }

  /** 当前页面的原意图路径，登录或恢复后回到这里。 */
  function buildNext(page, options) {
    const route = (page && page.route) || 'pages/today/today';
    const query = Object.keys(options || {})
      .filter((key) => options[key] !== undefined && options[key] !== null && options[key] !== '')
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(options[key])}`)
      .join('&');
    return query ? `${route}?${query}` : route;
  }

  /** 未登录拦截：只留下登录入口，不读取任何业务数据。 */
  function requireLogin(page, options) {
    const current = read();
    if (current) return current;
    const next = encodeURIComponent(buildNext(page, options));
    wx.reLaunch({ url: `/pages/login/login?next=${next}` });
    return null;
  }

  /** 会话失效：清掉本地会话，保留原路径回登录页。 */
  function handleAuthCode(code, page, options) {
    if (code !== 'unauthenticated' && code !== 'binding_required') return false;
    clear();
    const next = encodeURIComponent(buildNext(page, options));
    wx.reLaunch({ url: `/pages/login/login?next=${next}&reason=${code}` });
    return true;
  }

  return { read, save, clear, buildNext, requireLogin, handleAuthCode };
})();

module.exports = session;
