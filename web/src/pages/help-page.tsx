import { Link } from 'react-router-dom';
import { t, type MessageKey } from '@/i18n';
import { PageShell } from '@/ui/page-shell';
import styles from './help-page.module.css';

interface HelpSection {
  titleKey: MessageKey;
  bodyKey: MessageKey;
  links?: ReadonlyArray<{ to: string; labelKey: MessageKey }>;
}

const SECTIONS: readonly HelpSection[] = [
  {
    titleKey: 'help.start.title',
    bodyKey: 'help.start.body',
    links: [
      { to: '/today', labelKey: 'help.start.today' },
      { to: '/branches', labelKey: 'help.start.branches' },
      { to: '/history', labelKey: 'help.start.history' },
    ],
  },
  { titleKey: 'help.branch.title', bodyKey: 'help.branch.body' },
  { titleKey: 'help.history.title', bodyKey: 'help.history.body' },
  {
    titleKey: 'help.badge.title',
    bodyKey: 'help.badge.body',
    links: [{ to: '/me/badges', labelKey: 'badge.wall.title' }],
  },
  {
    titleKey: 'help.sync.title',
    bodyKey: 'help.sync.body',
    links: [{ to: '/settings#sync', labelKey: 'help.sync.action' }],
  },
  {
    titleKey: 'help.backup.title',
    bodyKey: 'help.backup.body',
    links: [{ to: '/data', labelKey: 'help.backup.action' }],
  },
];

const FAQ: ReadonlyArray<{ questionKey: MessageKey; answerKey: MessageKey }> = [
  { questionKey: 'help.faq.q1', answerKey: 'help.faq.a1' },
  { questionKey: 'help.faq.q2', answerKey: 'help.faq.a2' },
  { questionKey: 'help.faq.q3', answerKey: 'help.faq.a3' },
  { questionKey: 'help.faq.q4', answerKey: 'help.faq.a4' },
];

/**
 * S06 帮助（PRD V2-03 OP-01 / OP-02）。
 *
 * 只做本机说明与站内跳转，不联网；未登录时同步入口落到 O07 提示，备份入口照常可用。
 */
export function HelpPage() {
  return (
    <PageShell
      titleKey="page.help.title"
      bodyKey="page.help.body"
      back={
        <Link className={styles.back} to="/me">
          {t('nav.back')}
        </Link>
      }
    >
      <div className={styles.sections}>
        {SECTIONS.map((section) => (
          <section key={section.titleKey} className={styles.section}>
            <h2 className={styles.sectionTitle}>{t(section.titleKey)}</h2>
            <p className={styles.body}>{t(section.bodyKey)}</p>
            {section.links ? (
              <div className={styles.links}>
                {section.links.map((link) => (
                  <Link key={link.to} className={styles.link} to={link.to}>
                    {t(link.labelKey)}
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        ))}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('help.faq.title')}</h2>
          <dl className={styles.faq}>
            {FAQ.map((item) => (
              <div key={item.questionKey} className={styles.faqItem}>
                <dt className={styles.question}>{t(item.questionKey)}</dt>
                <dd className={styles.answer}>{t(item.answerKey)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </PageShell>
  );
}
