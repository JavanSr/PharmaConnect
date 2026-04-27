import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ForecastingPage } from '@/modules/analytics/ForecastingPage';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url === '/analytics/features') {
        return Promise.resolve({
          data: {
            data: {
              tier: 'PREMIUM',
              stockout: true,
              forecast: true,
              seasonality: true,
              deadStock: true,
            },
          },
        });
      }

      if (url === '/forecasting/stockout') {
        return Promise.resolve({ data: { data: [] } });
      }

      if (url === '/forecasting/seasonality') {
        return Promise.resolve({ data: { data: [] } });
      }

      if (url === '/forecasting/dead-stock') {
        return Promise.resolve({ data: { data: [] } });
      }

      if (url === '/forecasting/regional') {
        return Promise.resolve({
          data: {
            data: {
              enabled: false,
              status: 'disabled',
              message: 'Regional forecasting is disabled.',
            },
          },
        });
      }

      return Promise.resolve({ data: { data: null } });
    }),
  },
}));

describe('ForecastingPage', () => {
  it('always shows the early preview banner', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ForecastingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/Early preview/i)).toBeInTheDocument();
    expect(screen.getByText(/indicative data only/i)).toBeInTheDocument();
  });
});
