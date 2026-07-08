import { render, screen } from '@testing-library/react';

import { HeroCopy } from './hero-copy';

describe('HeroCopy', () => {
  it('renders the brand name and tagline', () => {
    render(<HeroCopy />);

    expect(screen.getByText('CommitToDo')).toBeInTheDocument();

    const tagline = screen.getByText((_content, element) => {
      if (element?.tagName !== 'P') return false;
      const text = element.textContent ?? '';
      return (
        text.includes('把目标分支化，把') &&
        text.includes('提交') &&
        text.includes('掉')
      );
    });
    expect(tagline).toBeInTheDocument();
  });

  it('highlights the word "提交" in brand green', () => {
    render(<HeroCopy />);

    const highlighted = screen.getByText('提交');
    expect(highlighted).toHaveClass('text-[var(--v3-primary)]');
  });

  it('renders the description text', () => {
    render(<HeroCopy />);

    expect(
      screen.getByText('用仓库组织目标，用分支推进任务，每次完成都有记录。')
    ).toBeInTheDocument();
  });
});
