import {
  LegalShell,
  type LegalPillarItem,
  type LegalReceiptItem,
  type LegalSectionSpec,
} from '@/components/legal/legal-shell';

const PRIVACY_RECEIPT: readonly LegalReceiptItem[] = [
  { tone: 'coral', titleKey: 'privacy.receipt.1.title', metaKey: 'privacy.receipt.1.meta' },
  { tone: 'sky', titleKey: 'privacy.receipt.2.title', metaKey: 'privacy.receipt.2.meta' },
  { tone: 'mint', titleKey: 'privacy.receipt.3.title', metaKey: 'privacy.receipt.3.meta' },
];

const PRIVACY_PILLARS: readonly LegalPillarItem[] = [
  {
    tone: 'coral',
    icon: 'lock',
    titleKey: 'privacy.pillar.1.title',
    descKey: 'privacy.pillar.1.desc',
  },
  {
    tone: 'sky',
    icon: 'cloud',
    titleKey: 'privacy.pillar.2.title',
    descKey: 'privacy.pillar.2.desc',
  },
  {
    tone: 'mint',
    icon: 'sliders',
    titleKey: 'privacy.pillar.3.title',
    descKey: 'privacy.pillar.3.desc',
  },
];

const PRIVACY_SECTIONS: readonly LegalSectionSpec[] = [
  {
    id: 'principles',
    numKey: 'privacy.s1.num',
    titleKey: 'privacy.s1.title',
    paragraphs: ['privacy.s1.p1', 'privacy.s1.p2'],
  },
  {
    id: 'inventory',
    numKey: 'privacy.s2.num',
    titleKey: 'privacy.s2.title',
    paragraphs: ['privacy.s2.p1'],
    table: {
      colTypeKey: 'privacy.table.col.type',
      colScopeKey: 'privacy.table.col.scope',
      colPurposeKey: 'privacy.table.col.purpose',
      colControlKey: 'privacy.table.col.control',
      rows: [
        {
          typeKey: 'privacy.table.r1.type',
          scopeKey: 'privacy.table.r1.scope',
          scopeTone: 'sky',
          purposeKey: 'privacy.table.r1.purpose',
          controlKey: 'privacy.table.r1.control',
        },
        {
          typeKey: 'privacy.table.r2.type',
          scopeKey: 'privacy.table.r2.scope',
          scopeTone: 'coral',
          purposeKey: 'privacy.table.r2.purpose',
          controlKey: 'privacy.table.r2.control',
        },
        {
          typeKey: 'privacy.table.r3.type',
          scopeKey: 'privacy.table.r3.scope',
          scopeTone: 'honey',
          purposeKey: 'privacy.table.r3.purpose',
          controlKey: 'privacy.table.r3.control',
        },
        {
          typeKey: 'privacy.table.r4.type',
          scopeKey: 'privacy.table.r4.scope',
          scopeTone: 'mint',
          purposeKey: 'privacy.table.r4.purpose',
          controlKey: 'privacy.table.r4.control',
        },
      ],
    },
    calloutKey: 'privacy.s2.callout',
  },
  {
    id: 'local-storage',
    numKey: 'privacy.s3.num',
    titleKey: 'privacy.s3.title',
    paragraphs: ['privacy.s3.p1'],
    bullets: [
      { leadKey: 'privacy.s3.b1.lead', textKey: 'privacy.s3.b1.text' },
      { leadKey: 'privacy.s3.b2.lead', textKey: 'privacy.s3.b2.text' },
    ],
  },
  {
    id: 'cloud-sync',
    numKey: 'privacy.s4.num',
    titleKey: 'privacy.s4.title',
    paragraphs: ['privacy.s4.p1'],
    bullets: [
      { leadKey: 'privacy.s4.b1.lead', textKey: 'privacy.s4.b1.text' },
      { leadKey: 'privacy.s4.b2.lead', textKey: 'privacy.s4.b2.text' },
    ],
  },
  {
    id: 'sharing',
    numKey: 'privacy.s5.num',
    titleKey: 'privacy.s5.title',
    paragraphs: ['privacy.s5.p1'],
    bullets: [
      { leadKey: 'privacy.s5.b1.lead', textKey: 'privacy.s5.b1.text' },
      { leadKey: 'privacy.s5.b2.lead', textKey: 'privacy.s5.b2.text' },
    ],
  },
  {
    id: 'security',
    numKey: 'privacy.s6.num',
    titleKey: 'privacy.s6.title',
    paragraphs: ['privacy.s6.p1', 'privacy.s6.p2'],
  },
  {
    id: 'rights',
    numKey: 'privacy.s7.num',
    titleKey: 'privacy.s7.title',
    paragraphs: ['privacy.s7.p1'],
    bullets: [
      { leadKey: 'privacy.s7.b1.lead', textKey: 'privacy.s7.b1.text' },
      { leadKey: 'privacy.s7.b2.lead', textKey: 'privacy.s7.b2.text' },
      { leadKey: 'privacy.s7.b3.lead', textKey: 'privacy.s7.b3.text' },
    ],
    afterParagraphs: ['privacy.s7.p2'],
  },
];

/** 独立法务文档页：隐私说明（/privacy）。 */
export function PrivacyPage() {
  return (
    <LegalShell
      kind="privacy"
      titleKey="privacy.title"
      leadBeforeKey="privacy.lead.before"
      leadHighlightKey="privacy.lead.highlight"
      leadAfterKey="privacy.lead.after"
      subtitleKey="privacy.subtitle"
      receiptItems={PRIVACY_RECEIPT}
      pillars={PRIVACY_PILLARS}
      sections={PRIVACY_SECTIONS}
      companionTo="/terms"
      companionActionKey="privacy.companion.action"
      companionDescKey="privacy.companion.desc"
      closingTitleKey="privacy.closing.title"
      closingDescKey="privacy.closing.desc"
    />
  );
}
