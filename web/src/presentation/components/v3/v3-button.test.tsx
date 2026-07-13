import { render, screen } from '@testing-library/react';
import { Link, MemoryRouter } from 'react-router-dom';

import { V3Button } from './v3-button';

describe('V3Button', () => {
  it('renders its children as a button', () => {
    render(<V3Button>进入工作台</V3Button>);

    expect(screen.getByRole('button', { name: '进入工作台' })).toBeInTheDocument();
  });

  it('applies the primary variant classes by default', () => {
    render(<V3Button>Primary</V3Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-[37px]');
    expect(button).toHaveClass('text-[var(--v3-text-on-primary)]');
  });

  it('applies the secondary variant classes when variant="secondary"', () => {
    render(<V3Button variant="secondary">Secondary</V3Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('bg-[var(--v3-control)]');
  });

  it('applies the small size classes when size="sm"', () => {
    render(<V3Button size="sm">Small</V3Button>);

    expect(screen.getByRole('button')).toHaveClass('h-8');
  });

  it('merges a custom className', () => {
    render(<V3Button className="w-full tablet:w-[158px]">Wide</V3Button>);

    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('renders its styles onto a router Link via asChild', () => {
    render(
      <MemoryRouter>
        <V3Button asChild>
          <Link to="/workspace">进入工作台</Link>
        </V3Button>
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: '进入工作台' });
    expect(link).toHaveAttribute('href', '/workspace');
    expect(link).toHaveClass('h-[37px]');
  });
});
