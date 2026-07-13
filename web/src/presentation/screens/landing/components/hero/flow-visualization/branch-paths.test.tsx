import { render } from '@testing-library/react';

import { BranchPaths } from './branch-paths';

describe('BranchPaths', () => {
  it('keeps the main trajectory horizontal', () => {
    const { container } = render(<BranchPaths />);

    const mainPath = container.querySelector('#flow-main');

    expect(mainPath).toHaveAttribute('d', 'M348 350 L1232 350');
  });

  it('keeps the trajectories merged before they branch out', () => {
    const { container } = render(<BranchPaths />);

    const upperPath = container.querySelector('#flow-upper');
    const lowerPath = container.querySelector('#flow-lower');

    expect(upperPath?.getAttribute('d')).toMatch(/^M348 350 L486 350/);
    expect(lowerPath?.getAttribute('d')).toMatch(/^M348 350 L486 350/);
  });
});
