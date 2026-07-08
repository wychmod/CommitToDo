import { ClipboardList, FileText, LayoutGrid, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

import { LandingBrand } from './landing-brand';
import { LandingHeaderActions } from './landing-header-actions';
import { LandingNavLink } from './landing-nav-link';

const navItems = [
  { href: '#features', icon: LayoutGrid, label: '功能' },
  { href: '#pricing', icon: Settings, label: '定价' },
  { href: '#docs', icon: FileText, label: '文档' },
  { href: '#changelog', icon: ClipboardList, label: '更新日志' },
];

export function LandingHeader(): JSX.Element {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`v3-enter v3-enter-delay-1 sticky top-0 z-50 h-16 w-full border-b border-[var(--v3-divider)] bg-[rgb(1_1_1_/96%)] ${
        scrolled ? 'backdrop-blur-[8px]' : ''
      }`}
    >
      <div className="mx-auto flex h-full max-w-[1576px] items-center justify-between px-5 tablet:px-9">
        <div className="flex items-center gap-6">
          <LandingBrand />

          <span
            className="hidden h-6 w-px bg-[var(--v3-border)] laptop:inline-block"
            aria-hidden="true"
          />

          <nav
            className="hidden items-center gap-1 laptop:flex"
            aria-label="主导航"
          >
            {navItems.map((item) => (
              <LandingNavLink
                key={item.label}
                href={item.href}
                icon={item.icon}
                label={item.label}
              />
            ))}
          </nav>
        </div>

        <LandingHeaderActions />
      </div>
    </header>
  );
}
