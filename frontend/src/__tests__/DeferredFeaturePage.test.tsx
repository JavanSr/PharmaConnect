import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { DeferredFeaturePage } from '@/modules/deferred/DeferredFeaturePage';

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('DeferredFeaturePage', () => {
  it('links Back to platform to /dashboard', () => {
    render(
      <MemoryRouter>
        <DeferredFeaturePage
          title="Deferred feature"
          description="Waiting on an external dependency."
          dependency="Dependency"
          dependencyStatus="Pending"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Back to platform/i })).toHaveAttribute('href', '/dashboard');
  });
});
