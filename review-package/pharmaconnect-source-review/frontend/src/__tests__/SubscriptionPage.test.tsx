import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { SubscriptionPage } from '@/modules/settings/SubscriptionPage';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn((url: string) => {
      if (url === '/settings/subscription') {
        return Promise.resolve({
          data: {
            data: {
              id: 'pharmacy-1',
              name: 'Test Pharmacy',
              licenceNumber: 'LIC-1',
              address: 'Arusha',
              region: 'Arusha',
              pharmacyType: 'RETAIL',
              subscriptionTier: 'STANDARD',
              billingCycle: 'MONTHLY',
              status: 'ACTIVE',
              trialActive: false,
              trialEndsAt: new Date().toISOString(),
              isActive: true,
              createdAt: new Date().toISOString(),
            },
          },
        });
      }

      if (url === '/settings/config/payment.methods') {
        return Promise.resolve({
          data: {
            data: {
              value: {
                methods: [],
              },
            },
          },
        });
      }

      return Promise.resolve({ data: { data: null } });
    }),
    put: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SubscriptionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SubscriptionPage', () => {
  it('renders all five tiers with the expected TZS pricing', async () => {
    useAuthStore.setState({
      user: {
        id: 'owner-1',
        email: 'owner@example.com',
        firstName: 'Owner',
        lastName: 'User',
        role: 'OWNER',
        pharmacyId: 'pharmacy-1',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
      isLoading: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ADDO')).toBeInTheDocument();
    });

    expect(screen.getByText('TZS 20,000')).toBeInTheDocument();
    expect(screen.getByText('TZS 55,000')).toBeInTheDocument();
    expect(screen.getByText('TZS 75,000')).toBeInTheDocument();
    expect(screen.getByText('TZS 100,000')).toBeInTheDocument();
    expect(screen.getByText('Negotiated')).toBeInTheDocument();
  });
});
