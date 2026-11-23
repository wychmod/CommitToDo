import {
  LegalShell,
  type LegalPillarItem,
  type LegalReceiptItem,
  type LegalSectionSpec,
} from '@/components/legal/legal-shell';

const TERMS_RECEIPT: readonly LegalReceiptItem[] = [
  { tone: 'coral', titleKey: 'terms.receipt.1.title', metaKey: 'terms.receipt.1.meta' },
  { tone: 'sky', titleKey: 'terms.receipt.2.title', metaKey: 'terms.receipt.2.meta' },
  { tone: 'mint', titleKey: 'terms.receipt.3.title', metaKey: 'terms.receipt.3.meta' },
];

const TERMS_PILLARS: readonly LegalPillarItem[] = [
  {
    tone: 'coral',
    icon: 'device',
    titleKey: 'terms.pillar.1.title',
    descKey: 'terms.pillar.1.desc',
  },
  {
    tone: 'sky',
    icon: 'shield',
    titleKey: 'terms.pillar.2.title',
    descKey: 'terms.pillar.2.desc',
  },
  {
    tone: 'mint',
    icon: 'export',
    titleKey: 'terms.pillar.3.title',
    descKey: 'terms.pillar.3.desc',
  },
];

const TERMS_SECTIONS: readonly LegalSectionSpec[] = [
  {
    id: 'acceptance',
    numKey: 'terms.s1.num',
    titleKey: 'terms.s1.title',
    paragraphs: ['terms.s1.p1', 'terms.s1.p2'],
  },
  {
    id: 'local-first',
    numKey: 'terms.s2.num',
    titleKey: 'terms.s2.title',
    paragraphs: ['terms.s2.p1'],
    bullets: [
      { leadKey: 'terms.s2.b1.lead', textKey: 'terms.s2.b1.text' },
      { leadKey: 'terms.s2.b2.lead', textKey: 'terms.s2.b2.text' },
      { leadKey: 'terms.s2.b3.lead', textKey: 'terms.s2.b3.text' },
    ],
  },
  {
    id: 'account',
    numKey: 'terms.s3.num',
    titleKey: 'terms.s3.title',
    paragraphs: ['terms.s3.p1'],
    bullets: [
      { leadKey: 'terms.s3.b1.lead', textKey: 'terms.s3.b1.text' },
      { leadKey: 'terms.s3.b2.lead', textKey: 'terms.s3.b2.text' },
    ],
  },
  {
    id: 'ownership',
    numKey: 'terms.s4.num',
    titleKey: 'terms.s4.title',
    paragraphs: ['terms.s4.p1', 'terms.s4.p2'],
    calloutKey: 'terms.s4.callout',
  },
  {
    id: 'sync-backup',
    numKey: 'terms.s5.num',
    titleKey: 'terms.s5.title',
    paragraphs: ['terms.s5.p1'],
    bullets: [
      { leadKey: 'terms.s5.b1.lead', textKey: 'terms.s5.b1.text' },
      { leadKey: 'terms.s5.b2.lead', textKey: 'terms.s5.b2.text' },
    ],
  },
  {
    id: 'acceptable-use',
    numKey: 'terms.s6.num',
    titleKey: 'terms.s6.title',
    paragraphs: ['terms.s6.p1', 'terms.s6.p2'],
  },
  {
    id: 'changes',
    numKey: 'terms.s7.num',
    titleKey: 'terms.s7.title',
    paragraphs: ['terms.s7.p1', 'terms.s7.p2'],
  },
];

/** 独立法务文档页：服务条款（/terms）。 */
export function TermsPage() {
  return (
    <LegalShell
      kind="terms"
      titleKey="terms.title"
      leadBeforeKey="terms.lead.before"
      leadHighlightKey="terms.lead.highlight"
      leadAfterKey="terms.lead.after"
      subtitleKey="terms.subtitle"
      receiptItems={TERMS_RECEIPT}
      pillars={TERMS_PILLARS}
      sections={TERMS_SECTIONS}
      companionTo="/privacy"
      companionActionKey="terms.companion.action"
      companionDescKey="terms.companion.desc"
      closingTitleKey="terms.closing.title"
      closingDescKey="terms.closing.desc"
    />
  );
}
