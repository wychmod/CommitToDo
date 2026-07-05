import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Database,
  GitCommit,
  ListChecks,
  Search,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface BootLine {
  label: string;
  value: string;
}

interface Capability {
  id: string;
  label: string;
  detail: string;
  icon: LucideIcon;
}

interface FlowNode {
  id: string;
  status: 'inbox' | 'active' | 'done';
}

const bootLines: BootLine[] = [
  { label: '待办索引', value: '就绪' },
  { label: '分支清单', value: '已挂载' },
  { label: '提交日志', value: '记录中' },
  { label: '本地数据', value: 'IndexedDB' },
];

const capabilities: Capability[] = [
  {
    id: 'todo',
    label: '新式 ToDo',
    detail: '把待办拆成仓库、分支和任务流，不只列清单，也保留上下文。',
    icon: ListChecks,
  },
  {
    id: 'commit',
    label: '完成即提交',
    detail: '创建、更新、完成和合并都会留下记录，让进展有迹可循。',
    icon: GitCommit,
  },
  {
    id: 'heatmap',
    label: '节奏热力图',
    detail: '把每天完成了什么、坚持了多久，压缩成一张可扫描的地图。',
    icon: CalendarCheck2,
  },
  {
    id: 'offline',
    label: '离线优先',
    detail: '数据留在浏览器本地，PWA 可安装，随时打开继续整理。',
    icon: ShieldCheck,
  },
];

const flowNodes: FlowNode[] = [
  { id: 'A1', status: 'done' },
  { id: 'B2', status: 'done' },
  { id: 'C3', status: 'active' },
  { id: 'D4', status: 'inbox' },
  { id: 'E5', status: 'inbox' },
  { id: 'F6', status: 'inbox' },
];

export function LandingScreen(): JSX.Element {
  return (
    <main className="landing-root" aria-label="CommitToDo 科技感启动首页">
      <div className="landing-ambient" aria-hidden />

      <header className="landing-topline landing-reveal landing-delay-1">
        <span>COMMITTODO // TASKFLOW</span>
        <span className="landing-topline-center">LOCAL TODO OPERATING SURFACE</span>
        <span>PWA / IDB / v0.1</span>
      </header>

      <section className="landing-hero" aria-label="CommitToDo 项目介绍">
        <div className="landing-terminal landing-reveal landing-delay-2">
          <p className="landing-kicker">commit@todo:~$</p>
          <h1 className="landing-title">
            <span>Commit</span>
            <span className="landing-hot">ToDo</span>
          </h1>
          <p className="landing-subtitle">
            CommitToDo 是一个新式 ToDo 工具：用仓库管理目标，用分支组织
            任务线，用提交记录每一次推进，再用图谱和热力图看见自己的节奏。
          </p>

          <div className="landing-boot" aria-label="启动状态">
            <p className="landing-type">
              booting committodo -- taskflow ready
            </p>
            {bootLines.map((line, index) => (
              <div
                key={line.label}
                className="landing-boot-line"
                style={{ animationDelay: `${620 + index * 120}ms` }}
              >
                <span>&gt; {line.label}</span>
                <span className="landing-dots" aria-hidden />
                <span className="landing-ok">{line.value}</span>
              </div>
            ))}
          </div>

          <div className="landing-actions">
            <Link to="/workspace" className="landing-primary">
              <span>进入工作台</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link to="/heatmap" className="landing-secondary">
              <BarChart3 className="h-4 w-4" aria-hidden />
              <span>查看热力图</span>
            </Link>
          </div>
        </div>

        <div className="landing-scan landing-reveal landing-delay-3">
          <div className="landing-scan-meta">
            <span>01 · TODO</span>
            <span>FLOW 072%</span>
            <span>02 · DONE</span>
          </div>
          <div className="landing-model-row">
            <div className="landing-model-box">
              <span>TO</span>
            </div>
            <div className="landing-model-box landing-model-box-hot">
              <span>DO</span>
            </div>
          </div>
          <div className="landing-scan-labels">
            <span>INBOX</span>
            <span>DONE</span>
            <span>FLOW·04</span>
          </div>
          <div className="landing-orbit" aria-hidden>
            <span />
          </div>
        </div>

        <div className="landing-signal landing-reveal landing-delay-4">
          <div className="landing-flow-map" aria-label="任务流动效">
            {flowNodes.map((node, index) => (
              <i
                key={node.id}
                className={`landing-flow-node landing-flow-node-${node.status}`}
                style={{ '--node-index': index } as React.CSSProperties}
              >
                <span>{node.id}</span>
              </i>
            ))}
            <span className="landing-flow-label landing-flow-label-start">
              inbox
            </span>
            <span className="landing-flow-label landing-flow-label-mid">
              commit
            </span>
            <span className="landing-flow-label landing-flow-label-end">
              done
            </span>
          </div>
          <div className="landing-slogan">
            <span>TASK</span>
            <strong>FLOW</strong>
          </div>
        </div>
      </section>

      <section
        className="landing-capabilities landing-reveal landing-delay-5"
        aria-label="核心能力"
      >
        {capabilities.map((item, index) => (
          <article key={item.id} className="landing-capability">
            <div className="landing-capability-index">
              {String(index + 1).padStart(2, '0')}
            </div>
            <item.icon className="h-4 w-4" aria-hidden />
            <div>
              <h2>{item.label}</h2>
              <p>{item.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <footer className="landing-command landing-reveal landing-delay-6">
        <span>$ committodo open --workspace</span>
        <span className="landing-command-dots" aria-hidden>
          ............
        </span>
        <span>OK</span>
        <Link to="/search" aria-label="进入搜索页面">
          <Search className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <span className="landing-command-tail">
          本地保存 / 可安装 / 可导出
        </span>
        <Database className="h-3.5 w-3.5" aria-hidden />
      </footer>
    </main>
  );
}
