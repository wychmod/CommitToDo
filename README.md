# CommitToDo

把每件小事变成一次提交，长成一棵看得见的分支树。

本地优先的个人任务与历程工具。仓库当前处于**重建起点**：旧 Web 实现已于 2026-11-19 整体清空，现有代码只是一个可运行的空壳，界面与业务都还没有开始做。

## 现状

- `web/`：React 18 + TypeScript + Vite 6，只有一条路由 `/`，渲染一个占位页
- 没有业务逻辑、数据层、账号与同步，也没有视觉方案
- 待定：视觉方向（深色与浅白两套都在评估）、工程规范（分层、门禁、测试）

## 快速开始

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | `tsc -b && vite build`，产物输出到 `dist/` |
| `npm run preview` | 预览生产构建 |

## 目录结构

```
Commit/
├── web/                        # Web 客户端
│   ├── src/                    #   main.tsx / app.tsx / pages/home-page.tsx / index.css
│   └── public/                 #   仅 favicon.svg
└── docs/                       # 文档
    ├── FRAMEWORK.md            #   产品框架
    ├── PRODUCT-STRATEGY.md     #   定位与硬约束
    └── archive/                #   归档（不得作为实现依据）
```

## 文档

| 文档 | 内容 |
|---|---|
| [`docs/FRAMEWORK.md`](./docs/FRAMEWORK.md) | 产品框架：单根分支树 + 5 个对象、4 个入口、59 项功能、版本切分 |
| [`docs/PRODUCT-STRATEGY.md`](./docs/PRODUCT-STRATEGY.md) | 产品定位、命名决策、主用户、硬约束与风险 |
| [`docs/archive/README.md`](./docs/archive/README.md) | 归档索引 |
| [`docs/archive/2026-11/legacy-impl/`](./docs/archive/2026-11/legacy-impl/README.md) | 旧 Web 实现档案（架构文档、过期清单、未引用静态资产） |

视觉规范：待重新设计，旧版已归档。

## 许可

MIT，见 [`LICENSE`](./LICENSE)。
