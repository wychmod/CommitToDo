/**
 * 四套空白页模板（PRD V2-03 §4.3 / OP-08）。
 *
 * 常量，不落库、不写 events；每套固定 1 条一级分支 + 2 条二级分支 + 4 条待办，
 * 二级分支各挂 2 条待办。层级关系由 @/data/apply-template 写入。
 */

export type TemplateId = 'fitness' | 'reading' | 'job' | 'side-project';

export interface TemplateTaskSpec {
  title: string;
  branch: 'primary' | 'secondary-a' | 'secondary-b';
}

export interface WorkspaceTemplate {
  id: TemplateId;
  primary: string;
  secondaries: readonly [string, string];
  tasks: readonly TemplateTaskSpec[];
}

export const TEMPLATES: readonly WorkspaceTemplate[] = [
  {
    id: 'fitness',
    primary: '健身',
    secondaries: ['训练计划', '饮食作息'],
    tasks: [
      { title: '完成 3 次力量训练', branch: 'secondary-a' },
      { title: '记录本周体重', branch: 'secondary-a' },
      { title: '安排一次户外跑', branch: 'secondary-b' },
      { title: '准备一周的餐食', branch: 'secondary-b' },
    ],
  },
  {
    id: 'reading',
    primary: '读书',
    secondaries: ['读书清单', '读书笔记'],
    tasks: [
      { title: '读完一本在途的书', branch: 'secondary-a' },
      { title: '挑下一本想读的书', branch: 'secondary-a' },
      { title: '写一条读书笔记', branch: 'secondary-b' },
      { title: '整理一次书架', branch: 'secondary-b' },
    ],
  },
  {
    id: 'job',
    primary: '求职',
    secondaries: ['简历作品', '面试准备'],
    tasks: [
      { title: '更新一版简历', branch: 'secondary-a' },
      { title: '整理作品集链接', branch: 'secondary-a' },
      { title: '投递 3 个职位', branch: 'secondary-b' },
      { title: '准备一次自我介绍', branch: 'secondary-b' },
    ],
  },
  {
    id: 'side-project',
    primary: '副业',
    secondaries: ['产品验证', '收入记录'],
    tasks: [
      { title: '写一页想法说明', branch: 'secondary-a' },
      { title: '找 3 个人聊聊', branch: 'secondary-a' },
      { title: '记录第一笔收入', branch: 'secondary-b' },
      { title: '设定本月小目标', branch: 'secondary-b' },
    ],
  },
];

export const TEMPLATE_BRANCH_COUNT = 3;
export const TEMPLATE_TASK_COUNT = 4;

export function templateById(id: TemplateId): WorkspaceTemplate {
  const found = TEMPLATES.find((template) => template.id === id);
  if (!found) throw new Error(`unknown template: ${id}`);
  return found;
}
