# CLAUDE.md

本文件不重复规范内容，仅作入口指引，避免多处维护导致规范漂移。

## 规范在哪里

| 需要什么 | 看哪里 |
|---|---|
| 分层、命名、代码风格、测试、门禁、提交 | [`AGENTS.md`](./AGENTS.md) |
| Web 端细则（V3 风格系统、只读区域） | [`web/AGENTS.md`](./web/AGENTS.md) |
| 产品框架：对象、页面、功能清单、徽章、版本切分 | [`docs/FRAMEWORK.md`](./docs/FRAMEWORK.md) |
| 产品定位、命名、主用户、硬约束、原则与风险 | [`docs/PRODUCT-STRATEGY.md`](./docs/PRODUCT-STRATEGY.md) |
| 现状架构、目标模型约束、数据模型、已知缺口 | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| 设计令牌与组件规范 | [`docs/DESIGN.md`](./docs/DESIGN.md) |
| 已失效的历史文档（只读，不得据此实现） | [`docs/archive/README.md`](./docs/archive/README.md) |

## 当前仓库结构

```
web/     React + TypeScript 客户端（唯一已实现端）
docs/    仓库级文档
```

单一客户端项目，所有代码与规范均以 TypeScript 为准。

## 动手前必读

1. 依赖只能向下：`presentation → application → domain ← data`，跨层 import 一律视为错误。
2. 数据访问经过 `domain` 接口 + DI 容器，表现层不直接 new 实现、不直接碰数据库。
3. 颜色 / 间距 / 圆角走设计令牌，不写裸色值与魔法数字。
4. 提交前在 `web/` 内跑完 `npm run lint`、`npx tsc -b`、`npm test`、`npm run build`。
5. 未确定的架构决策（其余端框架、云数据库形态、同步协议）不要自行发挥，先在 `docs/ARCHITECTURE.md` 的「待定事项」中记录并确认；产品方向与功能范围以 `docs/FRAMEWORK.md`、`docs/PRODUCT-STRATEGY.md` 为准。

## 常用命令

```bash
cd web
npm run dev        # 本地开发
npm test           # 单元测试
npm run build      # 生产构建
```
