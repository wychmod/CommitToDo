import { render, screen } from '@testing-library/react';

import { ValueSection } from './value-section';

class MockIntersectionObserver {
  observe = vi.fn();

  disconnect = vi.fn();

  unobserve = vi.fn();
}

Object.assign(global, {
  IntersectionObserver: MockIntersectionObserver,
});

describe('ValueSection', () => {
  it('renders the section heading', () => {
    render(<ValueSection />);

    expect(
      screen.getByText('为什么选择 CommitToDo')
    ).toBeInTheDocument();
    expect(
      screen.getByText('不是另一张清单，而是一套可回溯的行动系统。')
    ).toBeInTheDocument();
  });

  it('renders all four value cards', () => {
    render(<ValueSection />);

    expect(screen.getByText('目标有仓库')).toBeInTheDocument();
    expect(
      screen.getByText('把长期目标、项目和生活主题分别收纳，保持清晰边界。')
    ).toBeInTheDocument();

    expect(screen.getByText('任务有分支')).toBeInTheDocument();
    expect(
      screen.getByText('复杂计划拆成独立路线，切换时不丢失当前上下文。')
    ).toBeInTheDocument();

    expect(screen.getByText('完成即提交')).toBeInTheDocument();
    expect(
      screen.getByText(
        '每次推进都留下时间、分支和变更记录，随时可以回看。'
      )
    ).toBeInTheDocument();

    expect(screen.getByText('节奏看得见')).toBeInTheDocument();
    expect(
      screen.getByText(
        '用 Graph 与热力图回顾长期进展，发现自己的行动节奏。'
      )
    ).toBeInTheDocument();
  });
});
