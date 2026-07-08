import { render, screen } from '@testing-library/react';

import { LandingFooter } from './landing-footer';

describe('LandingFooter', () => {
  it('renders the brand name', () => {
    render(<LandingFooter />);

    expect(screen.getByText('CommitToDo')).toBeInTheDocument();
  });

  it('renders the technical status tags', () => {
    render(<LandingFooter />);

    expect(
      screen.getByText('Local-first • PWA • IndexedDB')
    ).toBeInTheDocument();
  });

  it('renders the local data disclaimer', () => {
    render(<LandingFooter />);

    expect(
      screen.getByText('数据默认保存在你的设备')
    ).toBeInTheDocument();
  });
});
