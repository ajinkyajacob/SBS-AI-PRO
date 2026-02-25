import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders ready status correctly', () => {
    render(<StatusBadge status="ready" device="webgpu" progress={100} />);
    expect(screen.getByText(/Engine: WEBGPU/i)).toBeInTheDocument();
  });

  it('renders loading status with progress', () => {
    render(<StatusBadge status="loading" device="cpu" progress={45} />);
    expect(screen.getByText(/Initializing CPU/i)).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('renders error status', () => {
    render(<StatusBadge status="error" device="cpu" progress={0} />);
    expect(screen.getByText(/Engine Error/i)).toBeInTheDocument();
  });
});
