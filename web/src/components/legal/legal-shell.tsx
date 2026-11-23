import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { t, type MessageKey } from '@/i18n';
import { ArrowIcon, ArrowLeftIcon, CheckIcon, ChevronDownIcon } from '@/ui/icons';
import styles from './legal-shell.module.css';

export type LegalDocKind = 'terms' | 'privacy';
export type LegalTone = 'coral' | 'sky' | 'mint' | 'honey';
export type LegalIconKind = 'device' | 'shield' | 'export' | 'lock' | 'cloud' | 'sliders';

export interface LegalReceiptItem {
  tone: LegalTone;
  titleKey: MessageKey;
  metaKey: MessageKey;
}

export interface LegalPillarItem {
  tone: LegalTone;
  icon: LegalIconKind;
  titleKey: MessageKey;
  descKey: MessageKey;
}

export interface LegalBulletItem {
  leadKey: MessageKey;
  textKey: MessageKey;
}

export interface LegalTableRow {
  typeKey: MessageKey;
  scopeKey: MessageKey;
  scopeTone: LegalTone;
  purposeKey: MessageKey;
  controlKey: MessageKey;
}

export interface LegalTableSpec {
  colTypeKey: MessageKey;
  colScopeKey: MessageKey;
  colPurposeKey: MessageKey;
  colControlKey: MessageKey;
  rows: readonly LegalTableRow[];
}

export interface LegalSectionSpec {
  id: string;
  numKey: MessageKey;
  titleKey: MessageKey;
  paragraphs: readonly MessageKey[];
  bullets?: readonly LegalBulletItem[];
  table?: LegalTableSpec;
  calloutKey?: MessageKey;
  afterParagraphs?: readonly MessageKey[];
}

export interface LegalShellProps {
  kind: LegalDocKind;
  titleKey: MessageKey;
  leadBeforeKey: MessageKey;
  leadHighlightKey: MessageKey;
  leadAfterKey: MessageKey;
  subtitleKey: MessageKey;
  receiptItems: readonly LegalReceiptItem[];
  pillars: readonly LegalPillarItem[];
  sections: readonly LegalSectionSpec[];
  companionTo: string;
  companionActionKey: MessageKey;
  companionDescKey: MessageKey;
  closingTitleKey: MessageKey;
  closingDescKey: MessageKey;
}

function PillarIcon({ kind }: { kind: LegalIconKind }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'device' ? (
        <>
          <rect x="3" y="4.5" width="18" height="12.5" rx="2.2" />
          <path d="M12 17v3.5M8.5 20.5h7" />
        </>
      ) : null}
      {kind === 'shield' ? (
        <>
          <path d="M12 3.5 5 6.5v5.3c0 4.3 2.9 7.8 7 8.7 4.1-.9 7-4.4 7-8.7V6.5l-7-3Z" />
          <path d="m9.2 12 2 2 3.8-4" />
        </>
      ) : null}
      {kind === 'export' ? (
        <>
          <path d="M12 15V4.5m0 0-3.5 3.5M12 4.5l3.5 3.5" />
          <path d="M4.5 14.5v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3.5" />
        </>
      ) : null}
      {kind === 'lock' ? (
        <>
          <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" />
          <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
          <circle cx="12" cy="15.2" r="1.2" fill="currentColor" stroke="none" />
        </>
      ) : null}
      {kind === 'cloud' ? (
        <>
          <path d="M7.5 18h9.2a3.8 3.8 0 0 0 .5-7.6A5.2 5.2 0 0 0 7 9.2 4 4 0 0 0 7.5 18Z" />
        </>
      ) : null}
      {kind === 'sliders' ? (
        <>
          <path d="M4.5 8h6m4 0h5M4.5 16h9m4 0h2" />
          <circle cx="12.5" cy="8" r="2" />
          <circle cx="15.5" cy="16" r="2" />
        </>
      ) : null}
    </svg>
  );
}

/**
 * 独立法务文档页外壳（/terms 与 /privacy 共用）。
 *
 * 沿用认证页的顶栏与冰蓝/蓝灰画板语言：顶部品牌与切换胶囊与正文对齐，
 * 首屏以「标题高亮 + 核心承诺回执卡」建立可读入口，正文采用左侧时间轨目录 + 右侧清晰条款排布。
 */
export function LegalShell({
  kind,
  titleKey,
  leadBeforeKey,
  leadHighlightKey,
  leadAfterKey,
  subtitleKey,
  receiptItems,
  pillars,
  sections,
  companionTo,
  companionActionKey,
  companionDescKey,
  closingTitleKey,
  closingDescKey,
}: LegalShellProps) {
  const firstId = sections[0]?.id ?? '';
  const [activeId, setActiveId] = useState(firstId);

  useEffect(() => {
    setActiveId(firstId);
    window.scrollTo({ top: 0 });
  }, [kind, firstId]);

  useEffect(() => {
    if (sections.length === 0) return;

    const HEADER_OFFSET = 148;

    const updateActive = () => {
      const reachedBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24;
      if (reachedBottom) {
        setActiveId(sections[sections.length - 1].id);
        return;
      }

      let current = sections[0].id;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= HEADER_OFFSET) {
          current = section.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };

    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateActive);
      window.removeEventListener('resize', updateActive);
    };
  }, [sections]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} to="/">
            <span className={styles.brandMark} aria-hidden="true">
              C
            </span>
            {t('app.name')}
          </Link>

          <nav className={styles.docSwitch} aria-label={t('legal.nav.label')}>
            <Link
              className={styles.docTab}
              data-active={kind === 'terms' || undefined}
              aria-current={kind === 'terms' ? 'page' : undefined}
              to="/terms"
            >
              {t('legal.nav.terms')}
            </Link>
            <Link
              className={styles.docTab}
              data-active={kind === 'privacy' || undefined}
              aria-current={kind === 'privacy' ? 'page' : undefined}
              to="/privacy"
            >
              {t('legal.nav.privacy')}
            </Link>
          </nav>

          <Link className={styles.local} to="/today">
            <span>{t('auth.localWorkspace')}</span>
            <ArrowIcon size={16} />
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="legal-title">
          <svg className={styles.heroOrnament} viewBox="0 0 420 260" aria-hidden="true" fill="none">
            <circle cx="330" cy="40" r="140" className={styles.heroRing} />
            <circle cx="330" cy="40" r="196" className={styles.heroRing} />
            <path d="M44 218 H376" className={styles.heroBranchMain} />
            <path d="M120 218 C152 218 164 184 198 184 H316" className={styles.heroBranchSub} />
            <circle cx="120" cy="218" r="4.5" className={styles.heroDotCoral} />
            <circle cx="242" cy="184" r="4.5" className={styles.heroDotSky} />
            <circle cx="316" cy="184" r="4.5" className={styles.heroDotMint} />
          </svg>

          <div className={styles.heroText}>
            <div className={styles.heroTopRow}>
              <Link className={styles.backLink} to="/auth/signup">
                <ArrowLeftIcon size={16} />
                <span>{t('legal.backSignup')}</span>
              </Link>
              <span className={styles.metaBadge}>
                <span className={styles.metaDot} aria-hidden="true" />
                <span>{t('legal.status.active')}</span>
                <span className={styles.metaSep} aria-hidden="true">
                  ·
                </span>
                <span className={styles.metaVersion}>{t('legal.version')}</span>
              </span>
            </div>

            <h1 id="legal-title" className={styles.title}>
              {t(titleKey)}
            </h1>

            <p className={styles.lead}>
              {t(leadBeforeKey)}
              <span className={styles.highlight}>{t(leadHighlightKey)}</span>
              {t(leadAfterKey)}
            </p>

            <p className={styles.subtitle}>{t(subtitleKey)}</p>
          </div>

          <aside className={styles.receipt} aria-label={t('legal.receipt.title')}>
            <div className={styles.receiptHead}>
              <span className={styles.receiptCheck} aria-hidden="true">
                <CheckIcon size={18} />
              </span>
              <strong className={styles.receiptTitle}>{t('legal.receipt.title')}</strong>
              <span className={styles.receiptTag}>{t('legal.receipt.count')}</span>
            </div>

            <ul className={styles.receiptList}>
              {receiptItems.map((item) => (
                <li key={item.titleKey} className={styles.receiptItem}>
                  <span className={styles.branchPip} data-tone={item.tone} aria-hidden="true" />
                  <div className={styles.receiptCopy}>
                    <span className={styles.receiptItemTitle}>{t(item.titleKey)}</span>
                    <span className={styles.receiptItemMeta}>{t(item.metaKey)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className={styles.pillars} aria-label={t('legal.receipt.title')}>
          {pillars.map((pillar) => (
            <div key={pillar.titleKey} className={styles.pillarCard}>
              <span className={styles.pillarIcon} data-tone={pillar.tone} aria-hidden="true">
                <PillarIcon kind={pillar.icon} />
              </span>
              <h2 className={styles.pillarTitle}>{t(pillar.titleKey)}</h2>
              <p className={styles.pillarDesc}>{t(pillar.descKey)}</p>
            </div>
          ))}
        </section>

        <details className={styles.mobileToc}>
          <summary className={styles.mobileTocSummary}>
            <span>{t('legal.toc.mobileToggle')}</span>
            <span className={styles.mobileTocCount}>{t('legal.toc.count')}</span>
            <ChevronDownIcon size={16} className={styles.mobileTocChevron} />
          </summary>
          <ol className={styles.mobileTocList}>
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  className={styles.mobileTocLink}
                  href={`#${section.id}`}
                  onClick={() => setActiveId(section.id)}
                >
                  <span className={styles.tocNum}>{t(section.numKey)}</span>
                  <span>{t(section.titleKey)}</span>
                </a>
              </li>
            ))}
          </ol>
        </details>

        <div className={styles.bodyGrid}>
          <aside className={styles.toc} aria-label={t('legal.toc.label')}>
            <div className={styles.tocHead}>
              <span className={styles.tocTitle}>{t('legal.toc.title')}</span>
              <span className={styles.tocCount}>{t('legal.toc.count')}</span>
            </div>

            <ol className={styles.tocList}>
              {sections.map((section) => {
                const isActive = activeId === section.id;
                return (
                  <li key={section.id} className={styles.tocItem}>
                    <a
                      className={styles.tocLink}
                      href={`#${section.id}`}
                      data-active={isActive || undefined}
                      aria-current={isActive ? 'location' : undefined}
                      onClick={() => setActiveId(section.id)}
                    >
                      <span className={styles.tocNode} aria-hidden="true" />
                      <span className={styles.tocNum}>{t(section.numKey)}</span>
                      <span className={styles.tocLabel}>{t(section.titleKey)}</span>
                    </a>
                  </li>
                );
              })}
            </ol>

            <div className={styles.companionCard}>
              <span className={styles.companionLabel}>{t('legal.toc.companionLabel')}</span>
              <Link className={styles.companionLink} to={companionTo}>
                <span>{t(companionActionKey)}</span>
                <ArrowIcon size={16} />
              </Link>
              <p className={styles.companionDesc}>{t(companionDescKey)}</p>
            </div>
          </aside>

          <article className={styles.article}>
            {sections.map((section) => (
              <section key={section.id} id={section.id} className={styles.section}>
                <header className={styles.sectionHead}>
                  <span className={styles.sectionNum}>{t(section.numKey)}</span>
                  <h2 className={styles.sectionTitle}>{t(section.titleKey)}</h2>
                </header>

                <div className={styles.sectionBody}>
                  {section.paragraphs.map((key) => (
                    <p key={key} className={styles.paragraph}>
                      {t(key)}
                    </p>
                  ))}

                  {section.bullets ? (
                    <ul className={styles.bulletList}>
                      {section.bullets.map((bullet) => (
                        <li key={bullet.leadKey} className={styles.bulletItem}>
                          <span className={styles.bulletMark} aria-hidden="true" />
                          <p className={styles.bulletText}>
                            <strong className={styles.bulletLead}>{t(bullet.leadKey)}</strong>
                            {t(bullet.textKey)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {section.table ? (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th scope="col">{t(section.table.colTypeKey)}</th>
                            <th scope="col">{t(section.table.colScopeKey)}</th>
                            <th scope="col">{t(section.table.colPurposeKey)}</th>
                            <th scope="col">{t(section.table.colControlKey)}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.table.rows.map((row) => (
                            <tr key={row.typeKey}>
                              <td className={styles.tablePrimary}>{t(row.typeKey)}</td>
                              <td>
                                <span className={styles.scopeChip} data-tone={row.scopeTone}>
                                  {t(row.scopeKey)}
                                </span>
                              </td>
                              <td>{t(row.purposeKey)}</td>
                              <td>{t(row.controlKey)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {section.calloutKey ? (
                    <div className={styles.callout}>
                      <span className={styles.calloutLabel}>{t('legal.callout.label')}</span>
                      <p className={styles.calloutText}>{t(section.calloutKey)}</p>
                    </div>
                  ) : null}

                  {section.afterParagraphs
                    ? section.afterParagraphs.map((key) => (
                        <p key={key} className={styles.paragraph}>
                          {t(key)}
                        </p>
                      ))
                    : null}
                </div>
              </section>
            ))}

            <section className={styles.closing} aria-labelledby="legal-closing-title">
              <div className={styles.closingText}>
                <h2 id="legal-closing-title" className={styles.closingTitle}>
                  {t(closingTitleKey)}
                </h2>
                <p className={styles.closingDesc}>{t(closingDescKey)}</p>
              </div>
              <div className={styles.closingActions}>
                <Link className={styles.closingPrimary} to={companionTo}>
                  <span>{t(companionActionKey)}</span>
                  <ArrowIcon size={16} />
                </Link>
                <Link className={styles.closingSecondary} to="/data">
                  {t('legal.closing.data')}
                </Link>
                <Link className={styles.closingSecondary} to="/me/help">
                  {t('legal.closing.help')}
                </Link>
              </div>
            </section>
          </article>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerNote}>
            {t('app.name')} · {t('legal.footer.note')}
          </span>
          <nav className={styles.footerLinks} aria-label={t('legal.nav.label')}>
            <Link className={styles.footerLink} to="/">
              {t('legal.footer.home')}
            </Link>
            <Link className={styles.footerLink} to="/terms">
              {t('legal.nav.terms')}
            </Link>
            <Link className={styles.footerLink} to="/privacy">
              {t('legal.nav.privacy')}
            </Link>
            <Link className={styles.footerLink} to="/auth/signup">
              {t('legal.closing.signup')}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
