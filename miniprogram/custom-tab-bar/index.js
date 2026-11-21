'use strict';

/**
 * 底部四项导航（PRD V2-04 §4.1）。
 *
 * 固定为今天 / 分支 / 历程 / 我的；不出现「记一笔」、搜索与设置。
 * 未登录时页面本身会被换成登录页，不渲染本导航。
 */
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/today/today', text: '今天', icon: 'today' },
      { pagePath: '/pages/branches/branches', text: '分支', icon: 'branch' },
      { pagePath: '/pages/history/history', text: '历程', icon: 'history' },
      { pagePath: '/pages/me/me', text: '我的', icon: 'me' }
    ]
  },

  methods: {
    onTap(event) {
      const index = Number(event.currentTarget.dataset.index);
      const target = this.data.list[index];
      if (!target || index === this.data.selected) return;
      wx.switchTab({ url: target.pagePath });
    }
  }
});
