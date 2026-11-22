import { Link } from 'react-router-dom';
import { t, type MessageKey } from '@/i18n';
import { PageShell } from '@/ui/page-shell';
import styles from './help-page.module.css';

interface HelpTopic {
  id: string;
  questionKey: MessageKey;
  answerKey: MessageKey;
  links: ReadonlyArray<{ to: string; labelKey: MessageKey }>;
}

/** 固定五个主题，顺序即 PRD V2-03 §4.1 的顺序。 */
const TOPICS: readonly HelpTopic[] = [
  {
    id: 'depth',
    questionKey: 'help.q1',
    answerKey: 'help.a1',
    links: [
      { to: '/branches', labelKey: 'help.q1.action' },
      { to: '/sample', labelKey: 'help.q1.sample' },
    ],
  },
  {
    id: 'stalled',
    questionKey: 'help.q2',
    answerKey: 'help.a2',
    links: [{ to: '/history', labelKey: 'help.q2.action' }],
  },
  {
    id: 'commit-lock',
    questionKey: 'help.q3',
    answerKey: 'help.a3',
    links: [{ to: '/history', labelKey: 'help.q3.action' }],
  },
  {
    id: 'merge',
    questionKey: 'help.q4',
    answerKey: 'help.a4',
    links: [{ to: '/history', labelKey: 'help.q4.action' }],
  },
  {
    id: 'device',
    questionKey: 'help.q5',
    answerKey: 'help.a5',
    links: [
      { to: '/settings#sync', labelKey: 'help.q5.sync' },
      { to: '/data', labelKey: 'help.q5.backup' },
    ],
  },
];

/**
 * S06 帮助（PRD V2-03 OP-01 / OP-02）。
 *
 * 内容为常量，不联网：五个主题固定顺序，默认全部收起，可同时展开多条。
 * 每条入口都落到本机页面；未登录时同步入口由设置页显示登录提示。
 */
export function HelpPage() {
  return (
    <PageShell
      compact
      titleKey="page.help.title"
      bodyKey="page.help.body"
      back={
        <Link className={styles.back} to="/me">
          {t('nav.back')}
        </Link>
      }
    >
      <div className={styles.topics}>
        {TOPICS.map((topic) => (
          <details key={topic.id} className={styles.topic}>
            <summary className={styles.question}>{t(topic.questionKey)}</summary>
            <div className={styles.answer}>
              <p className={styles.body}>{t(topic.answerKey)}</p>
              <div className={styles.links}>
                {topic.links.map((link) => (
                  <Link key={link.to} className={styles.link} to={link.to}>
                    {t(link.labelKey)}
                  </Link>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </PageShell>
  );
}
