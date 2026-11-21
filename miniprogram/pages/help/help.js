'use strict';

const session = require('../../utils/session');
const labels = require('../../utils/labels');

/**
 * 帮助（PRD V2-04 OP-07）。
 *
 * 内容与 Web 主端同口径，只补充第二端只读与同步延迟的说明；没有写操作入口。
 */
Page({
  data: {
    sections: labels.HELP_SECTIONS
  },

  onLoad(options) {
    this.entryOptions = options || {};
    session.requireLogin(this, this.entryOptions);
  }
});
