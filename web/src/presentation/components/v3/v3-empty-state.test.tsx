import '@/core/theme/v3-tokens.css';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inbox } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { V3EmptyState } from './v3-empty-state';

describe('V3EmptyState', () => {
  it('renders title and description', () => {
    render(
      <V3EmptyState
        icon={Inbox}
        title="没有任务"
        description="开始添加第一条任务。"
      />
    );

    expect(screen.getByText('没有任务')).toBeInTheDocument();
    expect(screen.getByText('开始添加第一条任务。')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    render(<V3EmptyState icon={Inbox} title="没有任务" />);

    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('calls the action when the button is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <V3EmptyState
        icon={Inbox}
        title="没有任务"
        action={{ label: '新建任务', onClick }}
      />
    );

    await user.click(screen.getByRole('button', { name: '新建任务' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
