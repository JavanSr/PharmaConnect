import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Search, Loader } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useNotificationStore } from '@/stores/notificationStore';

interface Wholesaler {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  pharmacyName?: string;
  region?: string;
  licenceNumber?: string;
  catalogueCacheCount: number;
}

export const WholesalerDiscoveryPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const toast = useNotificationStore((s) => s.toast);

  const { data: wholesalers = [], isLoading } = useQuery({
    queryKey: ['apotekh-wholesalers'],
    queryFn: () =>
      api
        .get('/suppliers/apotekh-wholesalers')
        .then((r) => r.data.data as Wholesaler[])
        .catch((e) => {
          toast.error(e.response?.data?.error || 'Failed to load wholesalers');
          return [];
        }),
  });

  const filtered = wholesalers.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.pharmacyName?.toLowerCase().includes(search.toLowerCase()) ||
      w.region?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#0D4035]">Wholesaler Marketplace</h1>
        <p className="mt-1 text-sm text-[#64748B]">Browse available suppliers and compare prices</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
        <Input
          placeholder="Search wholesalers by name, pharmacy, or region..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={20} className="animate-spin text-[#1A6B5C]" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-sm text-[#64748B]">
            {wholesalers.length === 0 ? 'No wholesalers available yet' : 'No wholesalers match your search'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((wholesaler) => (
            <Link
              key={wholesaler.id}
              to={`/inventory/wholesaler/${wholesaler.id}`}
              className="block"
            >
              <Card className="hover:border-[#1A6B5C] transition-colors cursor-pointer">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-[#0D4035]">{wholesaler.name}</p>
                      {wholesaler.pharmacyName && (
                        <p className="text-xs text-[#64748B]">{wholesaler.pharmacyName}</p>
                      )}
                    </div>
                    <div className="text-xs bg-[#EDF7F3] text-[#0D4035] px-2 py-1 rounded">
                      {wholesaler.catalogueCacheCount} items
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-[#64748B] pt-2">
                    {wholesaler.phone && (
                      <div className="flex items-center gap-1">
                        <Phone size={12} />
                        <span>{wholesaler.phone}</span>
                      </div>
                    )}
                    {wholesaler.email && (
                      <div className="flex items-center gap-1">
                        <Mail size={12} />
                        <span>{wholesaler.email}</span>
                      </div>
                    )}
                    {wholesaler.region && (
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span>{wholesaler.region}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
