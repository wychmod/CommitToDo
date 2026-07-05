import {
  ArrowRight,
  BarChart3,
  Database,
  GitBranch,
  Network,
  Search,
  ShieldCheck,
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
  icon: typeof GitBranch;
}

const bootLines: BootLine[] = [
  { label: 'repository index', value: 'ready' },
  { label: 'branch graph', value: 'online' },
  { label: 'task memory', value: 'mounted' },
  { label: 'local database', value: 'indexeddb' },
];

const capabilities: Capability[] = [
  {
    id: 'repo',
    label: '仓库 / 分支',
    detail: '为每个项目建立 main 分支，持续追踪任务流转。',
    icon: GitBranch,
  },
  {
    id: 'graph',
    label: 'Git Graph',
    detail: '用节点和连线复盘提交、合并与任务完成轨迹。',
    icon: Network,
  },
  {
    id: 'heatmap',
    label: '热力图',
    detail: '把完成密度压缩成一张可扫描的节奏地图。',
    icon: BarChart3,
  },
  {
    id: 'offline',
    label: '离线优先',
    detail: '数据留在浏览器本地，PWA 可安装、可继续使用。',
    icon: ShieldCheck,
  },
];

const signalBars = [48, 72, 92, 116, 154, 186, 142, 112, 88, 64];

export function LandingScreen(): JSX.Element {
  return (
    <main className="landing-root" aria-label="Commit 科技感启动首页">
      <div className="landing-ambient" aria-hidden />

      <header className="landing-topline landing-reveal landing-delay-1">
        <span>COMMIT.OS // M3</span>
        <span className="landing-topline-center">AGENT NATIVE PIPELINE</span>
        <span>F:0030/0750</span>
      </header>

      <section className="landing-hero" aria-label="Commit 项目介绍">
        <div className="landing-terminal landing-reveal landing-delay-2">
          <p className="landing-kicker">commit@agent:~$</p>
          <h1 className="landing-title">
            <span>( HI, </span>
            <span className="landing-hot">AGENT</span>
            <span> )</span>
          </h1>
          <p className="landing-subtitle">
            Commit 是一个离线优先的任务与提交节奏系统。把仓库、分支、
            任务、提交历史、Git Graph 和热力图压进同一个本地工作台。
          </p>

          <div className="landing-boot" aria-label="启动状态">
            <p className="landing-type">
              booting commit.os -- workspace ready
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
            <Link to="/graph" className="landing-secondary">
              <Network className="h-4 w-4" aria-hidden />
              <span>查看图形</span>
            </Link>
          </div>
        </div>

        <div className="landing-scan landing-reveal landing-delay-3">
          <div className="landing-scan-meta">
            <span>01 · MODEL</span>
            <span>SCAN 045%</span>
            <span>02 · GEN-3</span>
          </div>
          <div className="landing-model-row">
            <div className="landing-model-box">
              <span>C</span>
            </div>
            <div className="landing-model-box landing-model-box-hot">
              <span>M3</span>
            </div>
          </div>
          <div className="landing-scan-labels">
            <span>#E21680</span>
            <span>#FF633A</span>
            <span>MoE·64E</span>
          </div>
          <div className="landing-orbit" aria-hidden>
            <span />
          </div>
        </div>

        <div className="landing-signal landing-reveal landing-delay-4">
          <div className="landing-wave" aria-hidden>
            {signalBars.map((height, index) => (
              <span
                key={`${height}-${index}`}
                style={{
                  height,
                  animationDelay: `${index * 95}ms`,
                }}
              />
            ))}
          </div>
          <div className="landing-no-limits">
            <span>NO</span>
            <strong>LIMITS</strong>
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
        <span>$ commit team --spawn workspace</span>
        <span className="landing-command-dots" aria-hidden>
          ............
        </span>
        <span>OK</span>
        <Link to="/search" aria-label="进入搜索页面">
          <Search className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <span className="landing-command-tail">
          local data / pwa / indexeddb
        </span>
        <Database className="h-3.5 w-3.5" aria-hidden />
      </footer>
    </main>
  );
}
