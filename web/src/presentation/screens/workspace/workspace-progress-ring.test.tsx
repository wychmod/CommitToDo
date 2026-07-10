import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WorkspaceProgressRing } from './workspace-progress-ring';

describe('WorkspaceProgressRing', () => {
  it('renders an accessible label and center content', () => {
    render(
      <WorkspaceProgressRing progress={0.5} aria-label="完成率 50%">
        <span data-testid="center">3 / 6</span>
      </WorkspaceProgressRing>
    );

    expect(screen.getByLabelText('完成率 50%')).toBeInTheDocument();
    expect(screen.getByTestId('center')).toHaveTextContent('3 / 6');
  });

  it('clamps progress between 0 and 1', () => {
    const { container } = render(
      <WorkspaceProgressRing progress={1.5} size={100} strokeWidth={10} />
    );
    const progressCircle = container.querySelectorAll('circle')[1];
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    expect(progressCircle).toHaveAttribute(
      'stroke-dashoffset',
      String(0)
    );
    expect(progressCircle).toHaveAttribute(
      'stroke-dasharray',
      String(circumference)
    );
  });
});
