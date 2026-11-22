# CommitToDo

把每件小事变成一次提交，长成一棵看得见的分支树。

本地优先的个人任务与历程工具。仓库处于 Web 重建阶段，现有运行代码是可启动的占位壳。首页、分组树和页面画稿已进入设计交接。

## 现状

- `web/` 使用 React、TypeScript 和 Vite，当前以 `/` 的占位页作为启动入口。
- [设计交接](./docs/DESIGN.md) 收录已确认的明暗首页、分组树、全套页面图、设计令牌和组件。
- 产品功能与工程边界见 [功能框架](./docs/FRAMEWORK.md) 和 [技术架构](./docs/TECH-ARCHITECTURE.md)。

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
    ├── DESIGN.md               #   设计交接入口
    ├── FRAMEWORK.md            #   产品框架
    ├── PRODUCT-STRATEGY.md     #   定位与硬约束
    └── archive/                #   归档（不得作为实现依据）
```

Web 与微信小程序同仓库、独立构建发布。实现 Web 异地备份时先在根目录建立 `cloudfunctions/` 和 `cloudbaserc.json`，用于交付两端共享的 CloudBase 后端。微信小程序开工时建立独立 `miniprogram/`。目录与共享规则见 [技术架构](./docs/TECH-ARCHITECTURE.md#73-web-与微信小程序的仓库和后端边界)。

## 文档

| 文档 | 内容 |
|---|---|
| [设计交接](./docs/DESIGN.md) | 确认的首页、全套画稿、页面设计、视觉规范、动效和组件 |
| [Web 认证设计交接](./docs/web-auth/DESIGN.md) | 登录、注册、找回密码与账号设置的最新明暗稿和生成提示词 |
| [微信小程序设计交接](./docs/miniprogram/DESIGN.md) | 已确认的四张浅色画稿与生成提示词 |
| [功能框架](./docs/FRAMEWORK.md) | 单根分支树、5 个对象、4 个入口与版本切分 |
| [`docs/PRODUCT-STRATEGY.md`](./docs/PRODUCT-STRATEGY.md) | 产品定位、命名决策、主用户、硬约束与风险 |
| [技术架构](./docs/TECH-ARCHITECTURE.md) | 工程方案与数据、阶段边界 |
| [`docs/archive/README.md`](./docs/archive/README.md) | 归档索引 |
| [`docs/archive/2026-11/legacy-impl/`](./docs/archive/2026-11/legacy-impl/README.md) | 旧 Web 实现档案（架构文档、过期清单、未引用静态资产） |

## 许可

MIT，见 [`LICENSE`](./LICENSE)。
