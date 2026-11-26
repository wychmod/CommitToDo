'use strict';

const labels = require('./labels');

/** 把云函数返回的行补上分支色与截止日期文案，页面只负责排版。 */

function parseDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function daysBetween(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / 86400000);
}

function dueMeta(task, todayDate) {
  if (!task.dueDate) return { dueLabel: '无截止', tag: '' };
  if (task.dueDate === todayDate) return { dueLabel: '今天', tag: '今天' };
  if (task.dueDate < todayDate) {
    return { dueLabel: task.dueDate, tag: `逾期 ${daysBetween(task.dueDate, todayDate)} 天` };
  }
  return { dueLabel: task.dueDate, tag: '' };
}

function taskView(row, todayDate) {
  const due = dueMeta(row, todayDate);
  return Object.assign({}, row, {
    colorHex: labels.colorOf(row.branchColor),
    colorBg: labels.colorBgOf(row.branchColor),
    dueLabel: due.dueLabel,
    dueTag: due.tag
  });
}

function commitView(row) {
  return Object.assign({}, row, {
    colorHex: labels.colorOf(row.branchColor),
    colorBg: labels.colorBgOf(row.branchColor)
  });
}

function branchView(row) {
  return Object.assign({}, row, {
    colorHex: labels.colorOf(row.color),
    colorBg: labels.colorBgOf(row.color)
  });
}

function statusClass(status) {
  return status === 'merged' ? 'tag-neutral' : 'tag-warning';
}

/** 逐行记录从分组头到自己的链路，供轨道判断每一列是否还要继续向下画。 */
function collectRows(nodes, collapsed, depth, ancestors, out) {
  for (const node of nodes || []) {
    const open = collapsed[node.id] !== true;
    out.push(Object.assign(branchView(node), {
      depth,
      open,
      path: ancestors.concat([node.id]),
      rails: [],
      tagClass: statusClass(node.status)
    }));
    if (open && node.children && node.children.length > 0) {
      collectRows(node.children, collapsed, depth + 1, ancestors.concat([node.id]), out);
    }
  }
}

/** 同一列后面还有同源的行就贯通；否则本列到腰线为止，最内一列收成 L 形拐角。 */
function markRails(rows) {
  rows.forEach((row, index) => {
    const rails = [];
    for (let column = 0; column < row.depth; column += 1) {
      const owner = row.path[column];
      let continues = false;
      for (let next = index + 1; next < rows.length; next += 1) {
        const later = rows[next];
        if (later.depth > column && later.path[column] === owner) {
          continues = true;
          break;
        }
      }
      if (continues) rails.push({ key: column, kind: column === row.depth - 1 ? 'pass-arm' : 'pass' });
      else rails.push({ key: column, kind: column === row.depth - 1 ? 'elbow' : 'stop' });
    }
    row.rails = rails;
  });
}

/**
 * 分支页按画稿分组：根行单独一行，一级分支是带浅色底的分组头，
 * 其后是带缩进轨道的子行。根或分组收起时不下发其子行。
 */
function buildTreeView(root, collapsed) {
  if (!root) return { root: null, sections: [] };
  const rootView = Object.assign(branchView(root), { open: collapsed[root.id] !== true });
  const sections = [];
  if (rootView.open) {
    for (const group of root.children || []) {
      const rows = [];
      collectRows(group.children || [], collapsed, 1, [], rows);
      markRails(rows);
      sections.push(Object.assign(branchView(group), { open: collapsed[group.id] !== true, rows }));
    }
  }
  return { root: rootView, sections };
}

module.exports = { taskView, commitView, branchView, buildTreeView, daysBetween };
