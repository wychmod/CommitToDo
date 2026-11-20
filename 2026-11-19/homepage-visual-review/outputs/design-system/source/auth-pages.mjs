const symbols = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  device: '<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M12 16v4m-4 0h8"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  eye: '<path d="M2 12c3-4.3 6.3-6.5 10-6.5s7 2.2 10 6.5c-3 4.3-6.3 6.5-10 6.5S5 16.3 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  branch: '<circle cx="7" cy="5" r="2"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="6" r="2"/><path d="M7 7v10m10-9c0 4-1 5-5 5H7"/>',
};

function icon(name, size = 18) {
  return '<svg class="auth-icon" aria-hidden="true" width="' + size + '" height="' + size +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
    symbols[name] + '</svg>';
}

const authArt = '<aside class="auth-art" aria-label="CommitToDo 工作区预览">' +
  '<div class="auth-art-contours" aria-hidden="true"><i></i><i></i><i></i></div>' +
  '<div class="auth-art-heading"><h2>把小事放进自己的<br><span>今天。</span></h2>' +
  '<p>待办、分支和时间树，一处看得清。</p></div>' +
  '<div class="auth-art-paper">' +
    '<div class="auth-art-board">' +
      '<header><span>' + icon('branch', 15) + ' 我的工作区</span><span>11 月 20 日</span></header>' +
      '<h3>今天的待办</h3>' +
      '<ul class="auth-art-items"><li><i class="auth-art-check"></i><span>复查移动端界面</span></li>' +
      '<li class="auth-art-done"><i class="auth-art-check">' + icon('check', 12) + '</i><span>完成线框初稿</span></li>' +
      '<li><i class="auth-art-check"></i><span>整理一页读书笔记</span></li></ul>' +
    '</div>' +
    '<div class="auth-sticky" aria-hidden="true">' + icon('check', 39) + '<i></i><i></i><i></i></div>' +
    '<div class="auth-art-receipt"><span>' + icon('check', 14) + ' 已提交</span>' +
      '<strong>完成线框初稿</strong><small>工作 / 产品设计</small></div>' +
  '</div>' +
  '<div class="auth-art-map" aria-hidden="true">' +
    '<span class="auth-art-map-lane" style="--auth-node:var(--coral-1)"><i></i><i></i><i></i></span>' +
    '<span class="auth-art-map-lane" style="--auth-node:var(--sky-1)"><i></i><i></i><i></i></span>' +
    '<span class="auth-art-map-lane" style="--auth-node:var(--honey-1)"><i></i><i></i><i></i></span>' +
  '</div></aside>';

const email = '<label class="auth-field" for="auth-email"><span>邮箱</span>' +
  '<input id="auth-email" name="email" type="email" autocomplete="email" placeholder="name@example.com" required></label>';

function password(label, name, autocomplete, help = '') {
  const inputId = 'auth-' + name;
  return '<div class="auth-field"><label for="' + inputId + '">' + label + '</label><div class="auth-password">' +
    '<input id="' + inputId + '" name="' + name + '" type="password" autocomplete="' + autocomplete +
    '" placeholder="' + (name === 'confirm-password' ? '再输入一次密码' : '输入密码') +
    '" required' + (help ? ' aria-describedby="' + inputId + '-hint"' : '') + '>' +
    '<span class="auth-password-glyph" aria-hidden="true">' + icon('eye', 18) + '</span></div>' +
    (help ? '<div class="auth-strength" aria-hidden="true"><i></i><i></i><i></i></div><small id="' +
      inputId + '-hint">' + help + '</small>' : '') + '</div>';
}

const recoverySteps = ['填写邮箱', '检查邮箱', '设置新密码'];

function steps(current) {
  return '<ol class="auth-steps" aria-label="密码找回步骤">' + recoverySteps.map((name, index) =>
    '<li' + (index === current ? ' aria-current="step"' : '') + (index < current ? ' class="auth-step-complete"' : '') +
    '><span aria-hidden="true">' + (index < current ? icon('check', 11) : String(index + 1)) + '</span>' + name + '</li>'
  ).join('') + '</ol>';
}

function primary(text, disabled) {
  return '<button class="btn btn-primary auth-primary" type="submit"' + (disabled ? ' disabled' : '') +
    '><span>' + text + '</span>' + icon('arrow', 18) + '</button>';
}

function stage({ key, heading, description, fields, action, disabled = false, closing = '', after = '', prelude = '' }) {
  return '<div class="auth-page auth-' + key + '">' +
    '<header class="auth-header"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true">C</span>CommitToDo</a>' +
    '<a class="auth-local" href="/today">' + icon('device', 17) + '<span>打开本机工作区</span>' + icon('arrow', 15) + '</a></header>' +
    '<main class="auth-main"><div class="auth-stage">' + authArt +
      '<section class="auth-content" aria-labelledby="auth-heading"><div class="auth-form-shell">' +
        prelude + '<h1 id="auth-heading">' + heading + '</h1><p class="auth-description">' + description + '</p>' +
        (fields ? '<form class="auth-form" method="post">' + fields + primary(action, disabled) + '</form>' : '') +
        after + closing + '</div></section></div></main>' +
    '<footer class="auth-footer"><span>本机工作区可独立使用</span></footer></div>';
}

const signIn = '<p class="auth-closing">已有账号？ <a href="/auth/login">登录</a></p>';
const toLogin = '<p class="auth-closing"><a href="/auth/login">返回登录</a></p>';
const login = stage({
  key: 'login',
  heading: '登录',
  description: '登录后，可在设置中开启多设备同步。',
  fields: email + password('密码', 'password', 'current-password') +
    '<div class="auth-inline-actions"><a href="/auth/recover">忘记密码？</a></div>',
  action: '登录',
  closing: '<p class="auth-closing">还没有账号？ <a href="/auth/signup">创建账号</a></p>',
});
const signup = stage({
  key: 'signup',
  heading: '创建账号',
  description: '用一个账号，在不同设备上继续你的分支和待办。',
  fields: email + password('密码', 'password', 'new-password', '使用较长且未在其他网站用过的密码。') +
    password('确认密码', 'confirm-password', 'new-password') +
    '<div class="auth-consent"><input id="auth-consent" name="terms" type="checkbox" required aria-labelledby="auth-consent-text"><span id="auth-consent-text"><label for="auth-consent">我已阅读并同意</label> <a href="/terms">服务条款</a> 和 <a href="/privacy">隐私说明</a>。</span></div>',
  action: '创建账号',
  disabled: true,
  closing: signIn,
});
const recover = stage({
  key: 'recover',
  prelude: steps(0),
  heading: '找回密码',
  description: '填写注册时使用的邮箱，获取密码重置链接。',
  fields: email,
  action: '发送重置链接',
  closing: toLogin,
});
const sent = stage({
  key: 'recover-sent',
  prelude: steps(1) + '<span class="auth-mail-icon" aria-hidden="true">' + icon('mail', 25) + '</span>',
  heading: '请检查邮箱',
  description: '如果该邮箱关联账号，你会收到一封密码重置邮件。也请检查垃圾邮件文件夹。',
  after: '<div class="auth-recovery-note"><span>填写的邮箱</span><strong>name@example.com</strong></div>' +
    '<div class="auth-resend"><button class="btn btn-quiet" type="button" disabled>60 秒后可重发</button><a href="/auth/recover">修改邮箱</a></div>',
  closing: toLogin,
});
const reset = stage({
  key: 'recover-reset',
  prelude: steps(2),
  heading: '设置新密码',
  description: '设置好新密码后，即可登录你的账号。',
  fields: password('新密码', 'password', 'new-password', '使用较长且未在其他网站用过的密码。') +
    password('确认新密码', 'confirm-password', 'new-password'),
  action: '保存并登录',
  closing: toLogin,
});

export const pages = [
  { id: 'P09', slug: 'login', title: '登录', section: '', route: '/auth/login', layout: 'standalone', markup: login },
  { id: 'P10', slug: 'signup', title: '注册', section: '', route: '/auth/signup', layout: 'standalone', markup: signup },
  { id: 'P11', slug: 'recover', title: '找回密码', section: '', route: '/auth/recover', layout: 'standalone', markup: recover },
  { id: 'S11', slug: 'recover-sent', title: '找回密码 · 检查邮箱', section: '', route: '/auth/recover', layout: 'standalone', markup: sent },
  { id: 'S11', slug: 'recover-reset', title: '找回密码 · 设置新密码', section: '', route: '/auth/recover', layout: 'standalone', markup: reset },
];
