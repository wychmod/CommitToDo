'use strict';

/**
 * 只读页面的统一状态：加载 / 空 / 错误。
 *
 * 空态只说明当前没有内容，不显示示例树、引导或模板（PRD V2-04 §4.6）。
 */
Component({
  properties: {
    state: { type: String, value: 'loading' },
    title: { type: String, value: '' },
    body: { type: String, value: '' },
    actionText: { type: String, value: '' }
  },

  methods: {
    onAction() {
      this.triggerEvent('action');
    }
  }
});
