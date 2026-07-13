import '@/core/theme/v3-tokens.css';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { V3ErrorState } from './v3-error-state';

describe('V3ErrorState', () => {
  it('renders title and description', () => {
    render(
      <V3ErrorState
        title="加载失败"
        description="网络不可用。"
        onRetry={() => {}}
      />
    );

    expect(screen.getByText('加载失败')).toBeInTheDocument();
    expect(screen.getByText('网络不可用。')).toBeInTheDocument();
  });

  it('does not render a retry button without onRetry', () => {
    render(<V3ErrorState />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onRetry when the retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<V3ErrorState onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
