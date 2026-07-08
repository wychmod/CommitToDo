export interface NavItem {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
}

export const repositoryNavItems: NavItem[] = [
  { id: 'overview', label: '概览', icon: 'house', active: true },
  { id: 'tasks', label: '任务', icon: 'square-check' },
  { id: 'branches', label: '分支', icon: 'git-branch' },
  { id: 'commits', label: '提交', icon: 'git-commit' },
  { id: 'heatmap', label: '热力图', icon: 'chart-column' },
  { id: 'search', label: '搜索', icon: 'search' },
  { id: 'settings', label: '设置', icon: 'settings' },
];

export interface BranchItem {
  name: string;
  count: number;
  color: string;
}

export const branchList: BranchItem[] = [
  { name: 'main', count: 12, color: 'var(--v3-primary)' },
  { name: 'launch', count: 7, color: 'var(--v3-launch)' },
  { name: 'design', count: 6, color: 'var(--v3-design)' },
];

export interface TaskItem {
  completed: boolean;
  title: string;
  priority: string | null;
  status: string | null;
  time: string;
}

export interface TaskGroup {
  branch: string;
  branchColor: string;
  tasks: TaskItem[];
}

export const taskGroups: TaskGroup[] = [
  {
    branch: 'main',
    branchColor: 'var(--v3-primary)',
    tasks: [
      {
        completed: false,
        title: '撰写会议纪要',
        priority: '高优先级',
        status: '进行中',
        time: '今天 10:30',
      },
      {
        completed: true,
        title: '整理周报数据',
        priority: '中优先级',
        status: '已完成',
        time: '昨天 16:45',
      },
      {
        completed: false,
        title: '回邮件与需求确认',
        priority: '低优先级',
        status: '待办',
        time: '昨天 11:20',
      },
      {
        completed: false,
        title: '示例任务：完成首页介绍',
        priority: '低优先级',
        status: '待办',
        time: '7 月 5 日',
      },
    ],
  },
  {
    branch: 'launch',
    branchColor: 'var(--v3-launch)',
    tasks: [
      {
        completed: false,
        title: '完成页面原型',
        priority: null,
        status: '进行中',
        time: '昨天 09:15',
      },
      {
        completed: false,
        title: '对接后端接口',
        priority: null,
        status: '进行中',
        time: '7 月 4 日',
      },
      {
        completed: false,
        title: '上线前测试',
        priority: '低优先级',
        status: null,
        time: '7 月 2 日',
      },
    ],
  },
  {
    branch: 'design',
    branchColor: 'var(--v3-design)',
    tasks: [
      {
        completed: true,
        title: '设计系统规范',
        priority: null,
        status: '进行中',
        time: '7 月 2 日',
      },
      {
        completed: false,
        title: '组件库整理',
        priority: null,
        status: '已完成',
        time: '7 月 1 日',
      },
      {
        completed: false,
        title: '图标资源更新',
        priority: '低优先级',
        status: null,
        time: '6 月 30 日',
      },
    ],
  },
];

export interface CommitItem {
  type: string;
  typePrefix: string;
  title: string;
  hash: string;
  time: string;
  branch: string;
  nodeColor: string;
}

export const commitList: CommitItem[] = [
  {
    type: 'feat',
    typePrefix: 'feat:',
    title: '完成周报统计卡片',
    hash: 'a1b2c3d',
    time: '今天 10:42',
    branch: '',
    nodeColor: 'var(--v3-primary)',
  },
  {
    type: 'docs',
    typePrefix: 'docs:',
    title: '更新需求文档',
    hash: '9f8e7d6',
    time: '昨天 16:50',
    branch: 'main',
    nodeColor: '#838984',
  },
  {
    type: 'fix',
    typePrefix: 'fix:',
    title: '修复登录态过期问题',
    hash: '4e5d6c7',
    time: '昨天 11:33',
    branch: 'launch',
    nodeColor: 'var(--v3-launch)',
  },
  {
    type: 'chore',
    typePrefix: 'chore:',
    title: '优化项目依赖',
    hash: '1a2b3c4',
    time: '7 月 5 日',
    branch: 'design',
    nodeColor: 'var(--v3-launch)',
  },
];

export const heatmapMonths = ['2月', '3月', '4月', '5月', '6月', '7月'];
export const heatmapWeekdays = ['一', '二', '三', '四', '五', '六', '日'];

export const heatmapGrid: number[][] = [
  [0, 1, 0, 2, 1, 0, 3, 2, 1, 0, 2, 3],
  [1, 2, 1, 0, 2, 3, 1, 0, 2, 1, 0, 2],
  [0, 1, 2, 3, 1, 0, 2, 1, 3, 2, 1, 0],
  [2, 0, 1, 2, 0, 1, 0, 2, 1, 3, 2, 1],
  [1, 2, 0, 1, 2, 3, 1, 0, 2, 1, 3, 2],
  [0, 1, 2, 0, 1, 0, 2, 3, 1, 0, 2, 1],
  [1, 0, 1, 2, 3, 1, 0, 2, 1, 2, 0, 3],
];

export const heatmapStats = [
  { label: '完成任务', value: '45', highlight: false },
  { label: '连续完成', value: '12 天', highlight: true },
  { label: '本月提交', value: '18', highlight: true },
];
