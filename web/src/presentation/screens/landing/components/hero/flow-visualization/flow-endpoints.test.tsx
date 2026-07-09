import { render, screen } from '@testing-library/react';

import { FlowEndpoints } from './flow-endpoints';

describe('FlowEndpoints', () => {
  it('renders TODO and COMMIT labels', () => {
    render(
      <FlowEndpoints scaleX={1} scaleY={1} viewOffsetY={220} />
    );

    expect(screen.getByText('TODO')).toBeInTheDocument();
    expect(screen.getByText('COMMIT')).toBeInTheDocument();
  });

  it('renders the TODO dashed ring and circle icon', () => {
    render(
      <FlowEndpoints scaleX={1} scaleY={1} viewOffsetY={220} />
    );

    const todoContainer = screen.getByText('TODO').parentElement;
    expect(todoContainer).not.toBeNull();

    const todoBoxes = todoContainer?.querySelectorAll('div');
    expect(todoBoxes?.length).toBeGreaterThanOrEqual(3);
  });

  it('renders the COMMIT ring with white checkmark', () => {
    render(
      <FlowEndpoints scaleX={1} scaleY={1} viewOffsetY={220} />
    );

    const commitContainer = screen.getByText('COMMIT').parentElement;
    expect(commitContainer).not.toBeNull();

    const commitRings = commitContainer?.querySelectorAll('div');
    expect(commitRings?.length).toBeGreaterThanOrEqual(3);
  });

  it('renders all document icons', () => {
    render(
      <FlowEndpoints scaleX={1} scaleY={1} viewOffsetY={220} />
    );

    const icons = document.querySelectorAll('svg');
    // COMMIT checkmark + 6 document icons = 7 SVGs
    expect(icons.length).toBeGreaterThanOrEqual(7);
  });
});
