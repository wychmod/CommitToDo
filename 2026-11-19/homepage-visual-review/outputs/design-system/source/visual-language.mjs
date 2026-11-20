import { tokenData } from './shared.mjs';

const trackGraphic = '<svg class="ds-track-art" role="img" aria-label="页面调研从工作分支岔出，在后续日期合回。产品设计继续进行，阅读最近一次提交后有 37 天停滞。" viewBox="0 0 610 225">' +
  '<g class="ds-grid"><path d="M114 28v172m152-172v172m166-172v172m152-172v172"/></g>' +
  '<g class="ds-dates"><text x="114" y="20">10.14</text><text x="266" y="20">10.26</text><text x="432" y="20">11.08</text><text x="584" y="20">11.20</text></g>' +
  '<g class="ds-rail" style="--rail:var(--coral-1)"><path d="M113 52H584"/><circle cx="163" cy="52" r="4"/>' +
  '<path class="ds-diamond" d="M533 47l5 5-5 5-5-5z"/></g>' +
  '<g class="ds-rail" style="--rail:var(--coral-2)"><path d="M368 52c14 0 20 36 32 36H463c14 0 20-36 32-36"/>' +
  '<circle cx="419" cy="88" r="4"/><circle cx="456" cy="88" r="4"/><circle class="ds-merge" cx="495" cy="52" r="4"/>' +
  '<path d="M495 52c14 0 18 76 37 76H584"/><circle cx="571" cy="128" r="4"/><circle cx="584" cy="128" r="4"/></g>' +
  '<circle class="ds-select" cx="584" cy="128" r="8"/>' +
  '<g class="ds-rail" style="--rail:var(--honey-1)"><path class="ds-dashed" d="M114 172H584"/><circle cx="114" cy="172" r="4"/></g>' +
  '<g class="ds-lane-names"><text x="14" y="56">工作</text><text x="25" y="92">页面调研</text><text x="25" y="132">产品设计</text><text x="14" y="176">生活 / 阅读</text></g>' +
  '<text class="ds-stall" x="584" y="197" text-anchor="end">停滞 37 天</text></svg>';

export function languageBoard(theme) {
  const shades = Object.entries(tokenData.branches).map(([key, palette]) => {
    const [first, second, third] = palette[theme];
    return '<div class="ds-palette" style="--tint:var(--' + key + '-bg)">' +
      '<div class="ds-swatches"><i style="background:' + first + '"></i><i style="background:' + second + '"></i><i style="background:' + third + '"></i></div>' +
      '<div class="ds-palette-copy"><strong>' + palette.label + '</strong><span>' + palette.example + ' · 示例</span>' +
      '<small>' + first + '</small></div></div>';
  }).join('');
  return {
    slug: 'visual-language', title: '颜色与图形规范', board: true, markup:
      '<div class="page-head"><div><span class="eyebrow">CommitToDo 设计规范</span><h1>颜色与图形规范</h1>' +
      '<p>用颜色认分支，用线和形状读出关系。</p></div><span class="chip chip-info">' + (theme === 'light' ? '浅色' : '深色') + '</span></div>' +
      '<section class="panel ds-palette-panel"><div class="panel-head"><h2>七个可选分支色相</h2><span class="caption">色样从左至右 L1、L2、L3</span></div>' +
      '<div class="ds-palettes">' + shades + '</div></section>' +
      '<section class="ds-semantics" aria-label="语义色">' +
      '<span class="chip chip-info">信息 · 文件已校验</span><span class="chip chip-success">成功 · 已提交</span>' +
      '<span class="chip chip-warning">提醒 · 已逾期</span><span class="chip chip-danger">危险 · 清空数据</span>' +
      '<span class="chip">中性 · 已放下</span></section>' +
      '<div class="ds-geometry">' +
      '<section class="panel ds-tree-panel"><div class="panel-head"><h2>分支树</h2><span class="caption">结构视图</span></div>' +
      '<div class="ds-tree-diagram"><div><i class="ds-tree-root"></i><strong>我</strong><small>根 · 中性</small></div>' +
      '<div class="ds-depth-1"><i></i><strong>工作</strong><small>一级分支</small></div>' +
      '<div class="ds-depth-2 ds-current"><i></i><strong>产品设计</strong><small>进行中</small></div>' +
      '<div class="ds-depth-3"><i></i><strong>交互细化</strong><small>三级分支</small></div>' +
      '<div class="ds-depth-2 ds-ended"><i></i><strong>页面调研</strong><small>已合并</small></div></div>' +
      '<div class="ds-geometry-note"><strong>48 / 32 px</strong><span>舒适 / 紧凑行高</span><strong>20 px</strong><span>每层缩进</span>' +
      '<strong>8 × 8 px</strong><span>分支身份方点</span><strong>1 px</strong><span>正交连线</span></div></section>' +
      '<section class="panel ds-track-panel"><div class="panel-head"><h2>时间树</h2><span class="caption">日期从左向右</span></div>' +
      '<div class="ds-plot-overflow">' + trackGraphic + '</div><div class="ds-track-legend">' +
      '<span><i class="ds-glyph-commit"></i>提交</span><span><i class="ds-glyph-selected"></i>选中</span>' +
      '<span><i class="ds-glyph-milestone"></i>里程碑</span><span><i class="ds-glyph-merge"></i>合回</span>' +
      '<span><i class="ds-glyph-stall"></i>停滞</span></div>' +
      '<div class="ds-geometry-note"><strong>88 / 56 px</strong><span>一级 / 展开泳道</span><strong>1.5 px</strong><span>轨迹线</span>' +
      '<strong>4 + 4 px</strong><span>虚线段 / 空隙</span><strong>160 px</strong><span>固定标签栏</span></div></section></div>'
  };
}
