import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { LandingHeader } from './landing-header';

function renderWithRouter(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('LandingHeader', () => {
  it('renders the brand', () => {
    renderWithRouter(<LandingHeader />);

    expect(screen.getByText('CommitToDo')).toBeInTheDocument();
  });

  it('renders the primary navigation links', () => {
    renderWithRouter(<LandingHeader />);

    expect(screen.getByText('功能')).toBeInTheDocument();
    expect(screen.getByText('定价')).toBeInTheDocument();
    expect(screen.getByText('文档')).toBeInTheDocument();
    expect(screen.getByText('更新日志')).toBeInTheDocument();
  });

  it('renders the technical status tag', () => {
    renderWithRouter(<LandingHeader />);

    expect(
      screen.getByText('Local-first • PWA • IndexedDB')
    ).toBeInTheDocument();
  });

  it('renders the login and get-started actions', () => {
    renderWithRouter(<LandingHeader />);

    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByText('开始使用')).toBeInTheDocument();
  });

  it('renders the theme toggle button', () => {
    renderWithRouter(<LandingHeader />);

    expect(
      screen.getByRole('button', { name: /切换到.*模式/ })
    ).toBeInTheDocument();
  });

  it('applies backdrop blur only after scrolling', () => {
    const { container } = renderWithRouter(<LandingHeader />);
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();

    expect(header).not.toHaveClass('backdrop-blur-[8px]');

    Object.defineProperty(window, 'scrollY', {
      value: 100,
      configurable: true,
    });
    fireEvent.scroll(window);

    expect(header).toHaveClass('backdrop-blur-[8px]');

    Object.defineProperty(window, 'scrollY', {
      value: 0,
      configurable: true,
    });
    fireEvent.scroll(window);

    expect(header).not.toHaveClass('backdrop-blur-[8px]');
  });
});
