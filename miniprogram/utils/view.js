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

function flattenTree(nodes, collapsed, depth, out) {
  const list = out || [];
  for (const node of nodes || []) {
    const open = collapsed[node.id] === undefined ? true : !collapsed[node.id];
    list.push(Object.assign(branchView(node), { depth: depth || 0, open }));
    if (open && node.children && node.children.length > 0) {
      flattenTree(node.children, collapsed, (depth || 0) + 1, list);
    }
  }
  return list;
}

module.exports = { taskView, commitView, branchView, flattenTree, daysBetween };
