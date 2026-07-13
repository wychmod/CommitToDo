import '@/core/theme/v3-tokens.css';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { V3LoadingState } from './v3-loading-state';

describe('V3LoadingState', () => {
  it('renders the default loading text', () => {
    render(<V3LoadingState />);

    expect(screen.getByText('加载中…')).toBeInTheDocument();
  });

  it('renders a custom title', () => {
    render(<V3LoadingState title="正在保存…" />);

    expect(screen.getByText('正在保存…')).toBeInTheDocument();
  });

  it('marks the region as busy', () => {
    render(<V3LoadingState />);

    expect(screen.getByRole('status', { busy: true })).toBeInTheDocument();
  });
});
