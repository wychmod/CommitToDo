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

  it('renders the TODO ring and green checkmark square', () => {
    render(
      <FlowEndpoints scaleX={1} scaleY={1} viewOffsetY={220} />
    );

    const todoContainer = screen.getByText('TODO').parentElement;
    expect(todoContainer).not.toBeNull();

    const todoBoxes = todoContainer?.querySelectorAll('div');
    expect(todoBoxes?.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the COMMIT green circle with white checkmark', () => {
    render(
      <FlowEndpoints scaleX={1} scaleY={1} viewOffsetY={220} />
    );

    const commitContainer = screen.getByText('COMMIT').parentElement;
    expect(commitContainer).not.toBeNull();

    const commitNebulaLayers = commitContainer?.querySelectorAll(
      '.v3-commit-nebula-outer, .v3-commit-nebula-mid, .v3-commit-nebula-core'
    );
    expect(commitNebulaLayers?.length).toBe(3);
  });

  it('renders all document icons', () => {
    render(
      <FlowEndpoints scaleX={1} scaleY={1} viewOffsetY={220} />
    );

    const icons = document.querySelectorAll('svg');
    // TODO checkmark + COMMIT checkmark + 8 document icons = 10 SVGs
    expect(icons.length).toBeGreaterThanOrEqual(10);
  });
});
