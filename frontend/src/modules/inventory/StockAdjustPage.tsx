import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { StockAdjustmentSuggestion, UserRole } from '@/types';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';

const MOVEMENT_TYPES = [
  { value: 'ADJUSTED', label: 'Stock Adjustment (quantity correction)' },
  { value: 'DAMAGED', label: 'Damaged / Spoiled' },
  { value: 'EXPIRED_REMOVED', label: 'Expired - Removed from shelf' },
  { value: 'DONATED', label: 'Donated' },
  { value: 'TRANSFERRED', label: 'Transferred to another facility' },
  { value: 'RETURNED', label: 'Returned to supplier' },
];

const SUGGESTION_REASONS = [
  { value: 'COUNT_VARIANCE', label: 'Count variance' },
  { value: 'DAMAGED', label: 'Damaged stock' },
  { value: 'EXPIRED', label: 'Expired stock' },
  { value: 'RETURN_TO_SUPPLIER', label: 'Return to supplier' },
  { value: 'FOUND_STOCK', label: 'Found stock / increase' },
  { value: 'OTHER', label: 'Other' },
];
const OWNER_REVIEW_ROLES: UserRole[] = ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'];

export const StockAdjustPage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useNotificationStore((state) => state.toast);
  const user = useAuthStore((state) => state.user);
  const isSuggestionMode = user?.role === 'DISPENSER';
  const canReviewSuggestions = Boolean(user?.role && OWNER_REVIEW_ROLES.includes(user.role));

  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [movementType, setMovementType] = useState('ADJUSTED');
  const [quantity, setQuantity] = useState('');
  const [quantityDelta, setQuantityDelta] = useState('');
  const [suggestionReason, setSuggestionReason] = useState('COUNT_VARIANCE');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [partialQuantityBySuggestion, setPartialQuantityBySuggestion] = useState<Record<string, string>>({});
  const [reviewNoteBySuggestion, setReviewNoteBySuggestion] = useState<Record<string, string>>({});

  const debouncedSearch = useDebounce(productSearch, 300);

  const { data: searchData } = useQuery({
    queryKey: ['product-search', debouncedSearch],
    queryFn: () => api.get('/inventory/products', { params: { search: debouncedSearch, limit: 8 } }).then((response) => response.data),
    enabled: debouncedSearch.length > 1,
  });

  const { data: productDetail } = useQuery({
    queryKey: ['product-detail', selectedProduct?.id],
    queryFn: () => api.get(`/inventory/products/${selectedProduct.id}`).then((response) => response.data),
    enabled: Boolean(selectedProduct?.id),
  });
  const { data: suggestionQueueData, isLoading: isSuggestionQueueLoading } = useQuery({
    queryKey: ['stock-adjustment-suggestions', 'PENDING'],
    queryFn: () => api.get('/inventory/adjustment-suggestions', { params: { status: 'PENDING' } }).then((response) => response.data),
    enabled: canReviewSuggestions,
  });

  const products = searchData?.data || [];
  const batches = productDetail?.data?.batches || [];
  const pendingSuggestions = (suggestionQueueData?.data || []) as StockAdjustmentSuggestion[];

  const mutation = useMutation({
    mutationFn: async () => {
      if (isSuggestionMode) {
        const formData = new FormData();
        formData.append('productId', selectedProduct.id);
        if (selectedBatch) {
          formData.append('batchId', selectedBatch);
        }
        formData.append('quantityDelta', quantityDelta);
        formData.append('reason', suggestionReason);
        if (notes.trim()) {
          formData.append('note', notes.trim());
        }
        if (photoFile) {
          formData.append('photo', photoFile);
        }

        return api.post('/inventory/adjustment-suggestions', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      const compiledNotes = [reason.trim(), notes.trim(), referenceNumber.trim()].filter(Boolean).join(' | ') || undefined;

      return api.post('/inventory/movements/adjust', {
        productId: selectedProduct.id,
        batchId: selectedBatch || undefined,
        type: movementType,
        quantity: parseInt(quantity, 10),
        notes: compiledNotes,
      });
    },
    onSuccess: () => {
      toast.success(isSuggestionMode ? 'Stock adjustment suggestion submitted' : 'Stock movement recorded');
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product-detail', selectedProduct?.id] });
      navigate('/inventory');
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Failed to save stock adjustment'),
  });
  const reviewMutation = useMutation({
    mutationFn: async (payload: {
      suggestionId: string;
      status: 'APPROVED' | 'REJECTED' | 'PARTIAL';
      approvedQuantityDelta?: number;
      reviewNote?: string;
    }) =>
      api.patch(`/inventory/adjustment-suggestions/${payload.suggestionId}/review`, {
        status: payload.status,
        approvedQuantityDelta: payload.approvedQuantityDelta,
        reviewNote: payload.reviewNote,
      }),
    onSuccess: (_response, payload) => {
      toast.success(payload.status === 'REJECTED' ? 'Suggestion rejected' : 'Suggestion review saved');
      qc.invalidateQueries({ queryKey: ['stock-adjustment-suggestions', 'PENDING'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Failed to review suggestion'),
  });

  const needsReason = ['ADJUSTED', 'DAMAGED', 'EXPIRED_REMOVED', 'DONATED', 'TRANSFERRED'].includes(movementType);
  const noteRequiredForSuggestion = suggestionReason === 'OTHER';
  const parsedQuantityDelta = parseInt(quantityDelta, 10);
  const canSubmitDirectAdjustment =
    Boolean(selectedProduct) &&
    Boolean(quantity) &&
    parseInt(quantity, 10) > 0 &&
    (!needsReason || (reason.trim().length > 0 && notes.trim().length >= 10));
  const canSubmitSuggestion =
    Boolean(selectedProduct) &&
    Number.isInteger(parsedQuantityDelta) &&
    parsedQuantityDelta !== 0 &&
    (!noteRequiredForSuggestion || notes.trim().length > 0);

  const submitSuggestionReview = (suggestion: StockAdjustmentSuggestion, status: 'APPROVED' | 'REJECTED' | 'PARTIAL') => {
    const reviewNote = reviewNoteBySuggestion[suggestion.id]?.trim() || undefined;

    if (status === 'APPROVED') {
      reviewMutation.mutate({
        suggestionId: suggestion.id,
        status,
        approvedQuantityDelta: suggestion.quantityDelta,
        reviewNote,
      });
      return;
    }

    if (status === 'REJECTED') {
      reviewMutation.mutate({
        suggestionId: suggestion.id,
        status,
        reviewNote,
      });
      return;
    }

    const partialQuantity = parseInt(partialQuantityBySuggestion[suggestion.id] || '', 10);
    if (!Number.isInteger(partialQuantity) || partialQuantity === 0) {
      toast.error('Enter a partial approved quantity delta before saving');
      return;
    }

    reviewMutation.mutate({
      suggestionId: suggestion.id,
      status,
      approvedQuantityDelta: partialQuantity,
      reviewNote,
    });
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/inventory" className="rounded-xl p-2 text-[#64748B] transition-colors hover:bg-[#D6F0E8]">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#0D4035]">
            {isSuggestionMode ? 'Stock Adjustment Suggestion' : 'Stock Adjustment'}
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            {isSuggestionMode
              ? 'Submit a suggested stock correction for owner review. Stock will not change at this step.'
              : 'Record a stock movement directly while approval workflow is being phased in.'}
          </p>
        </div>
      </div>

      <Card>
        <div className="space-y-5">
          <div className="relative">
            <Input
              label="Product *"
              value={selectedProduct ? `${selectedProduct.genericName || selectedProduct.name}` : productSearch}
              onChange={(event) => {
                setProductSearch(event.target.value);
                setSelectedProduct(null);
                setSelectedBatch('');
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search product name or generic name..."
              leftIcon={<Search size={16} />}
            />
            {showDropdown && products.length > 0 && !selectedProduct && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[#D6F0E8] bg-white shadow-lg">
                {products.map((product: any) => (
                  <button
                    key={product.id}
                    type="button"
                    className="w-full px-4 py-2.5 text-left transition-colors hover:bg-[#EDF7F3]"
                    onClick={() => {
                      setSelectedProduct(product);
                      setProductSearch('');
                      setShowDropdown(false);
                    }}
                  >
                    <p className="text-sm font-medium text-[#0D4035]">{product.genericName || product.name}</p>
                    <p className="text-xs text-[#64748B]">
                      {[product.brandName, `Stock: ${product.currentStock ?? 0}`].filter(Boolean).join(' | ')}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProduct && (
            <div className="flex items-center justify-between rounded-xl bg-[#EDF7F3] p-3">
              <div>
                <p className="text-sm font-medium text-[#0D4035]">{selectedProduct.genericName || selectedProduct.name}</p>
                <p className="text-xs text-[#64748B]">
                  Current stock: {selectedProduct.currentStock ?? 0} {selectedProduct.unitOfMeasure}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setSelectedBatch('');
                }}
                className="text-xs text-[#DC2626] hover:underline"
              >
                Change
              </button>
            </div>
          )}

          {batches.length > 0 && (
            <Select
              label="Batch (optional - leave blank to auto-select)"
              value={selectedBatch}
              onChange={(event) => setSelectedBatch(event.target.value)}
              options={[
                { value: '', label: 'Auto-select (FEFO)' },
                ...batches.map((batch: any) => ({
                  value: batch.id,
                  label: `Batch ${batch.batchNumber} - Exp: ${new Date(batch.expiryDate).toLocaleDateString()} - ${batch.quantityRemaining} units`,
                })),
              ]}
            />
          )}

          {isSuggestionMode ? (
            <>
              <Input
                label="Quantity delta *"
                type="number"
                value={quantityDelta}
                onChange={(event) => setQuantityDelta(event.target.value)}
                placeholder="Use -3 for a decrease or 5 for an increase"
              />

              <Select
                label="Reason *"
                value={suggestionReason}
                onChange={(event) => setSuggestionReason(event.target.value)}
                options={SUGGESTION_REASONS}
              />

              <div>
                <label htmlFor="stock-adjustment-suggestion-note" className="mb-1.5 block text-sm font-medium text-[#374151]">
                  Note {noteRequiredForSuggestion ? '*' : '(optional)'}
                </label>
                <textarea
                  id="stock-adjustment-suggestion-note"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder={
                    noteRequiredForSuggestion
                      ? 'Explain this stock adjustment request...'
                      : 'Add any supporting context for the owner if needed'
                  }
                  className="w-full resize-none rounded-xl border border-[#D6F0E8] px-3 py-2.5 text-sm text-[#0D4035] focus:outline-none focus:ring-2 focus:ring-[#1A6B5C]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#374151]">Photo evidence (optional)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-[#0D4035] file:mr-4 file:rounded-xl file:border-0 file:bg-[#EDF7F3] file:px-4 file:py-2 file:font-medium file:text-[#1A6B5C] hover:file:bg-[#D6F0E8]"
                />
                {photoFile && <p className="mt-2 text-xs text-[#64748B]">{photoFile.name}</p>}
              </div>
            </>
          ) : (
            <>
              <Select
                label="Movement Type *"
                value={movementType}
                onChange={(event) => setMovementType(event.target.value)}
                options={MOVEMENT_TYPES}
              />

              <Input
                label="Quantity *"
                type="number"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                min="1"
                placeholder="Number of units"
              />

              {needsReason && (
                <>
                  <Input
                    label="Reason *"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Brief reason for adjustment"
                  />
                  <div>
                    <label htmlFor="stock-adjustment-direct-note" className="mb-1.5 block text-sm font-medium text-[#374151]">
                      Notes * <span className="text-xs font-normal text-[#64748B]">(min. 10 characters - required for audit)</span>
                    </label>
                    <textarea
                      id="stock-adjustment-direct-note"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      placeholder="Describe the circumstances in detail..."
                      className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm text-[#0D4035] focus:outline-none focus:ring-2 focus:ring-[#1A6B5C] ${
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
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="e.g. disposal certificate, transfer note..."
              />
            </>
          )}
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => navigate('/inventory')}>Cancel</Button>
        <Button
          leftIcon={<Save size={16} />}
          loading={mutation.isPending}
          disabled={isSuggestionMode ? !canSubmitSuggestion : !canSubmitDirectAdjustment}
          onClick={() => mutation.mutate()}
        >
          {isSuggestionMode ? 'Submit Suggestion' : 'Record Movement'}
        </Button>
      </div>

      {canReviewSuggestions && (
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0D4035]">Pending owner review</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Review dispenser suggestions here. This step records the decision only and keeps stock unchanged until the approval action is enforced.
              </p>
            </div>

            {isSuggestionQueueLoading ? (
              <p className="text-sm text-[#64748B]">Loading pending suggestions...</p>
            ) : pendingSuggestions.length === 0 ? (
              <p className="text-sm text-[#64748B]">No pending stock adjustment suggestions right now.</p>
            ) : (
              <div className="space-y-4">
                {pendingSuggestions.map((suggestion) => {
                  const isReviewingCurrentSuggestion =
                    reviewMutation.isPending && reviewMutation.variables?.suggestionId === suggestion.id;

                  return (
                    <div key={suggestion.id} className="rounded-2xl border border-[#D6F0E8] bg-[#F8FCFA] p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#0D4035]">
                            {suggestion.product?.genericName || suggestion.product?.name || 'Unknown product'}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            Requested delta: {suggestion.quantityDelta > 0 ? '+' : ''}
                            {suggestion.quantityDelta} | Reason: {suggestion.reason.split('_').join(' ')}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            Submitted by {suggestion.creator?.firstName} {suggestion.creator?.lastName} on{' '}
                            {new Date(suggestion.createdAt).toLocaleString()}
                          </p>
                          {suggestion.batch?.batchNumber && (
                            <p className="text-xs text-[#64748B]">Batch: {suggestion.batch.batchNumber}</p>
                          )}
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-[#D6F0E8] px-2.5 py-1 text-xs font-medium text-[#0D4035]">
                          {suggestion.status}
                        </span>
                      </div>

                      {suggestion.note && <p className="mt-3 text-sm text-[#0D4035]">{suggestion.note}</p>}

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <Input
                          label="Partial approved delta"
                          type="number"
                          value={partialQuantityBySuggestion[suggestion.id] || ''}
                          onChange={(event) =>
                            setPartialQuantityBySuggestion((current) => ({
                              ...current,
                              [suggestion.id]: event.target.value,
                            }))
                          }
                          placeholder="Use -1 or 2"
                        />
                        <Input
                          label="Review note (optional)"
                          value={reviewNoteBySuggestion[suggestion.id] || ''}
                          onChange={(event) =>
                            setReviewNoteBySuggestion((current) => ({
                              ...current,
                              [suggestion.id]: event.target.value,
                            }))
                          }
                          placeholder="Add audit context for this decision"
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          loading={isReviewingCurrentSuggestion}
                          disabled={reviewMutation.isPending}
                          onClick={() => submitSuggestionReview(suggestion, 'APPROVED')}
                        >
                          Approve full
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          loading={isReviewingCurrentSuggestion && reviewMutation.variables?.status === 'PARTIAL'}
                          disabled={reviewMutation.isPending}
                          onClick={() => submitSuggestionReview(suggestion, 'PARTIAL')}
                        >
                          Save partial
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          loading={isReviewingCurrentSuggestion && reviewMutation.variables?.status === 'REJECTED'}
                          disabled={reviewMutation.isPending}
                          onClick={() => submitSuggestionReview(suggestion, 'REJECTED')}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
