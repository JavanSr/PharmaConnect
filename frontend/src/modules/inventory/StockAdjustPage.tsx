import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/stores/notificationStore';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';

const MOVEMENT_TYPES = [
  { value: 'ADJUSTED', label: 'Stock Adjustment (quantity correction)' },
  { value: 'DAMAGED', label: 'Damaged / Spoiled' },
  { value: 'EXPIRED_REMOVED', label: 'Expired — Removed from shelf' },
  { value: 'DONATED', label: 'Donated' },
  { value: 'TRANSFERRED', label: 'Transferred to another facility' },
  { value: 'RETURNED', label: 'Returned to supplier' },
];

export const StockAdjustPage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useNotificationStore(s => s.toast);

  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [movementType, setMovementType] = useState('ADJUSTED');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const debouncedSearch = useDebounce(productSearch, 300);

  const { data: searchData } = useQuery({
    queryKey: ['product-search', debouncedSearch],
    queryFn: () => api.get('/inventory/products', { params: { search: debouncedSearch, limit: 8 } }).then(r => r.data),
    enabled: debouncedSearch.length > 1,
  });

  const { data: productDetail } = useQuery({
    queryKey: ['product-detail', selectedProduct?.id],
    queryFn: () => api.get(`/inventory/products/${selectedProduct.id}`).then(r => r.data),
    enabled: Boolean(selectedProduct?.id),
  });

  const products = searchData?.data || [];
  const batches = productDetail?.data?.batches || [];

  const mutation = useMutation({
    mutationFn: () => api.post('/inventory/movements', {
      productId: selectedProduct.id,
      batchId: selectedBatch || undefined,
      type: movementType,
      quantity: parseInt(quantity, 10),
      reason: reason || undefined,
      notes: notes || undefined,
      referenceNumber: referenceNumber || undefined,
    }),
    onSuccess: () => {
      toast.success('Stock movement recorded');
      qc.invalidateQueries({ queryKey: ['products'] });
      navigate('/inventory');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to record movement'),
  });

  const needsReason = ['ADJUSTED', 'DAMAGED', 'EXPIRED_REMOVED', 'DONATED', 'TRANSFERRED'].includes(movementType);
  const canSubmit = selectedProduct && quantity && parseInt(quantity, 10) > 0 &&
    (!needsReason || (reason.trim().length > 0 && notes.trim().length >= 10));

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/inventory" className="p-2 rounded-xl hover:bg-[#D6F0E8] text-[#64748B] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-[#0D4035] flex-1">Stock Adjustment</h1>
      </div>

      <Card>
        <div className="space-y-5">
          {/* Product search */}
          <div className="relative">
            <Input
              label="Product *"
              value={selectedProduct ? `${selectedProduct.genericName || selectedProduct.name}` : productSearch}
              onChange={e => {
                setProductSearch(e.target.value);
                setSelectedProduct(null);
                setSelectedBatch('');
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search product name or generic name..."
              leftIcon={<Search size={16} />}
            />
            {showDropdown && products.length > 0 && !selectedProduct && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-[#D6F0E8] rounded-xl shadow-lg overflow-hidden">
                {products.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-[#EDF7F3] transition-colors"
                    onClick={() => {
                      setSelectedProduct(p);
                      setProductSearch('');
                      setShowDropdown(false);
                    }}
                  >
                    <p className="text-sm font-medium text-[#0D4035]">{p.genericName || p.name}</p>
                    {p.brandName && <p className="text-xs text-[#64748B]">{p.brandName} · Stock: {p.currentStock ?? 0}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProduct && (
            <div className="p-3 bg-[#EDF7F3] rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#0D4035]">{selectedProduct.genericName || selectedProduct.name}</p>
                <p className="text-xs text-[#64748B]">Current stock: {selectedProduct.currentStock ?? 0} {selectedProduct.unitOfMeasure}</p>
              </div>
              <button onClick={() => { setSelectedProduct(null); setSelectedBatch(''); }} className="text-xs text-[#DC2626] hover:underline">Change</button>
            </div>
          )}

          {/* Batch selector */}
          {batches.length > 0 && (
            <Select
              label="Batch (optional — leave blank to auto-select)"
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
              options={[
                { value: '', label: 'Auto-select (FEFO)' },
                ...batches.map((b: any) => ({
                  value: b.id,
                  label: `Batch ${b.batchNumber} — Exp: ${new Date(b.expiryDate).toLocaleDateString()} — ${b.quantityRemaining} units`,
                })),
              ]}
            />
          )}

          <Select
            label="Movement Type *"
            value={movementType}
            onChange={e => setMovementType(e.target.value)}
            options={MOVEMENT_TYPES}
          />

          <Input
            label="Quantity *"
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            min="1"
            placeholder="Number of units"
          />

          {needsReason && (
            <>
              <Input
                label="Reason *"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Brief reason for adjustment"
              />
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">
                  Notes * <span className="text-xs text-[#64748B] font-normal">(min. 10 characters — required for audit)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Describe the circumstances in detail..."
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm text-[#0D4035] resize-none focus:outline-none focus:ring-2 focus:ring-[#1A6B5C] ${
                    notes.length > 0 && notes.trim().length < 10 ? 'border-[#DC2626]' : 'border-[#D6F0E8]'
                  }`}
                />
                <p className={`mt-1 text-xs ${notes.trim().length >= 10 ? 'text-[#64748B]' : 'text-[#DC2626]'}`}>
                  {notes.trim().length}/10 characters minimum
                </p>
              </div>
            </>
          )}

          <Input
            label="Reference Number (optional)"
            value={referenceNumber}
            onChange={e => setReferenceNumber(e.target.value)}
            placeholder="e.g. disposal certificate, transfer note..."
          />
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => navigate('/inventory')}>Cancel</Button>
        <Button
          leftIcon={<Save size={16} />}
          loading={mutation.isPending}
          disabled={!canSubmit}
          onClick={() => mutation.mutate()}
        >
          Record Movement
        </Button>
      </div>
    </div>
  );
};
