import { render, screen } from '@testing-library/react';

import { samplePath } from '../../../utils/sample-path';
import { FlowVisualization } from './flow-visualization';

vi.mock('../../../utils/sample-path', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../utils/sample-path')>();
  return {
    ...original,
    samplePath: vi.fn().mockReturnValue({
      points: Array.from({ length: 501 }, (_, i) => ({
        x: 348 + i * 1.75,
        y: 350,
      })),
      totalLength: 1000,
    }),
  };
});

const mockedSamplePath = vi.mocked(samplePath);

describe('FlowVisualization', () => {
  it('renders TODO and COMMIT labels', () => {
    render(<FlowVisualization />);

    expect(screen.getByText('TODO')).toBeInTheDocument();
    expect(screen.getByText('COMMIT')).toBeInTheDocument();
  });

  it('renders the canvas and SVG layers', () => {
    render(<FlowVisualization />);

    expect(document.querySelector('canvas')).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('samples the flow paths after mount', () => {
    render(<FlowVisualization />);

    expect(mockedSamplePath).toHaveBeenCalled();
    expect(mockedSamplePath.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
