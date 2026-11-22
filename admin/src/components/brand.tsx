import { copy } from '@/i18n';

export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      className="admin-brand-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <g transform="rotate(-8 16 16)">
        <rect className="admin-brand-mark__frame" x="4.5" y="4.5" width="23" height="23" rx="4" />
        <path className="admin-brand-mark__c" d="M20.6 12.1a6 6 0 1 0 0 7.8" />
      </g>
    </svg>
  );
}

export function BrandLockup() {
  return (
    <span className="admin-brand">
      <BrandMark />
      <span className="admin-brand__words">
        <strong className="admin-brand__word">{copy.app.wordmark}</strong>
        <span className="admin-brand__suffix">{copy.app.wordmarkSuffix}</span>
      </span>
    </span>
  );
}
